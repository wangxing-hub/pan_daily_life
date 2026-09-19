#!/usr/bin/env python3
"""把 AI 生成的素材处理成游戏可用的透明图。

原始图片的问题：
  1. 没有 alpha 通道，背景是一整片接近纯白的噪点；
  2. 9 个动作排成一行（6048x672，每格 672x672），人物只占中间一小块；
  3. 每格人物位置略有漂移，直接切图动画会抖。

处理流程：
  从四边泛洪填充去掉背景 -> 柔和边缘去白边 -> 去掉小噪点 ->
  取所有格子的公共包围盒（保证帧间不抖动）-> 缩小 2 倍 ->
  输出 assets/<名字>.png + assets/<名字>.json

除了人物精灵表，还会把 2048x2048 的卡通半身像裁成圆形对话头像：
去背景 -> 定位头肩 -> 圆形裁切（深色底 + 黄铜圈）-> 输出 assets/<名字>.png
"""

from __future__ import annotations

import json
import struct
import sys
import zlib
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# 人物精灵表：源文件 -> 输出名
SHEETS = [
    {"src": "潘尔赛的人物精灵图.png", "name": "pan_ersai"},
    {"src": "黄姐移动精灵图.png", "name": "huang_jie"},
    {"src": "杨凡移动精灵图.png", "name": "yang_fan"},
]

# 对话头像：源文件 -> 输出名
# diameterScale / centerShift 是个别素材的取景微调：杨凡那张全身像在画面里
# 框得比较远、脑袋偏小，按默认比例裁出来会显得人很小，所以收一点、往下挪一点。
PORTRAITS = [
    {"src": "潘尔赛卡通图.png", "name": "avatar_pan"},
    {"src": "黄姐卡通图片.png", "name": "avatar_huang"},
    {
        "src": "杨凡卡通图片.png",
        "name": "avatar_yang",
        "diameterScale": 0.86,
        "centerShift": [0, 50],
    },
]

# 场景背景图：源文件 -> 输出名
# 松鸭湖那张右下角带着"豆包AI生成"的水印，用上方同色地面盖掉，
# 再缩到游戏里实际显示的尺寸（1280 宽铺满画布）。
BACKGROUNDS = [
    {
        "src": "松鸭湖背景图.png",
        "name": "lake_bg",
        "outWidth": 1280,
        "watermarks": [{"x": 2002, "y": 1633, "w": 274, "h": 62}],
    },
]

FRAME_W = 672          # 原图每格宽度
DOWNSCALE = 2          # 输出时缩小倍数
PAD = 4                # 公共包围盒外扩像素
AVATAR_SIZE = 224      # 对话头像输出尺寸


# --------------------------------------------------------------------------- PNG 读取

def read_png(path: Path) -> tuple[int, int, int, int, bytes]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} 不是 PNG 文件")
    pos, idat = 8, b""
    width = height = bitdepth = colortype = None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            width, height, bitdepth, colortype, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            if interlace:
                raise ValueError("不支持隔行扫描的 PNG")
        elif ctype == b"IDAT":
            idat += chunk
        elif ctype == b"IEND":
            break
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[colortype]
    if bitdepth != 8:
        raise ValueError(f"只支持 8bit PNG，当前 {bitdepth}bit")

    raw = zlib.decompress(idat)
    stride = width * channels
    out = bytearray(width * height * channels)
    prev = bytearray(stride)
    p = 0
    for y in range(height):
        f = raw[p]
        p += 1
        line = bytearray(raw[p : p + stride])
        p += stride
        if f == 1:      # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 255
        elif f == 2:    # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:    # Average
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:    # Paeth
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prev[i]
                c = prev[i - channels] if i >= channels else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y * stride : (y + 1) * stride] = line
        prev = line
    return width, height, channels, colortype, bytes(out)


# --------------------------------------------------------------------------- PNG 写出

def write_png(path: Path, width: int, height: int, rgba: bytearray) -> None:
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw += rgba[y * stride : (y + 1) * stride]

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


# --------------------------------------------------------------------------- 抠图

def is_background(r: int, g: int, b: int) -> bool:
    """接近纯白且没有彩色的像素视为背景。"""
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    sat = max(r, g, b) - min(r, g, b)
    return lum >= 205 and sat <= 20


def cut_background(width: int, height: int, channels: int, px: bytes) -> bytearray:
    """去掉接近纯白的背景，返回每像素 alpha。"""
    # 1) 从四边泛洪，标记与画布边缘连通的背景像素
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        i = y * width + x
        if visited[i]:
            return
        p = i * channels
        if not is_background(px[p], px[p + 1], px[p + 2]):
            return
        visited[i] = 1
        queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            push(x - 1, y)
        if x < width - 1:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y < height - 1:
            push(x, y + 1)

    # 2) 生成 alpha：背景全透明，贴着背景的浅灰像素做半透明过渡，去掉白边
    alpha = bytearray(width * height)
    for y in range(height):
        row = y * width
        for x in range(width):
            i = row + x
            if visited[i]:
                continue
            p = i * channels
            r, g, b = px[p], px[p + 1], px[p + 2]
            sat = max(r, g, b) - min(r, g, b)
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            touches_bg = False
            for dy in (-1, 0, 1):
                ny = y + dy
                if ny < 0 or ny >= height:
                    continue
                for dx in (-1, 0, 1):
                    nx = x + dx
                    if 0 <= nx < width and visited[ny * width + nx]:
                        touches_bg = True
                        break
                if touches_bg:
                    break
            if touches_bg and sat <= 22:
                # 越接近纯白越透明，越接近人物本色越不透明
                a = (238.0 - lum) / 58.0
                alpha[i] = int(max(0.0, min(1.0, a)) * 255)
            else:
                alpha[i] = 255

    # 3) 去掉零星噪点（面积很小的前景连通块）
    component = [0] * (width * height)
    comp_id = 0
    comp_size: list[int] = [0]
    for y in range(height):
        for x in range(width):
            i = y * width + x
            if alpha[i] == 0 or component[i]:
                continue
            comp_id += 1
            size = 0
            stack = [(x, y)]
            component[i] = comp_id
            while stack:
                cx, cy = stack.pop()
                size += 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        ni = ny * width + nx
                        if alpha[ni] and not component[ni]:
                            component[ni] = comp_id
                            stack.append((nx, ny))
            comp_size.append(size)

    removed = 0
    for i in range(width * height):
        if alpha[i] and comp_size[component[i]] < 200:
            alpha[i] = 0
            removed += 1
    print(f"清除噪点像素 {removed} 个（连通块 <200px）")
    return alpha


def process_sheet(job: dict) -> dict:
    src = ROOT / job["src"]
    if not src.exists():
        print(f"找不到源图：{src}", file=sys.stderr)
        return {}

    width, height, channels, colortype, px = read_png(src)
    print(f"\n=== 精灵表 {src.name}  {width}x{height}  通道={channels} ===")
    frames = width // FRAME_W
    print(f"每格 {FRAME_W}x{height}，共 {frames} 帧")
    alpha = cut_background(width, height, channels, px)

    # 4) 所有帧共用一个「格内」包围盒，避免动画抖动
    min_x, min_y, max_x, max_y = FRAME_W, height, -1, -1
    per_frame_boxes = []
    for f in range(frames):
        fx0, fx1 = f * FRAME_W, (f + 1) * FRAME_W
        fmin_x, fmin_y, fmax_x, fmax_y = fx1, height, fx0, -1
        for y in range(height):
            row = y * width
            for x in range(fx0, fx1):
                if alpha[row + x]:
                    if x < fmin_x:
                        fmin_x = x
                    if x > fmax_x:
                        fmax_x = x
                    if y < fmin_y:
                        fmin_y = y
                    if y > fmax_y:
                        fmax_y = y
        per_frame_boxes.append((fmin_x - fx0, fmin_y, fmax_x - fx0, fmax_y))
        if fmax_x < 0:
            print(f"警告：第 {f} 帧没有内容")
            continue
        min_x = min(min_x, fmin_x - fx0)
        min_y = min(min_y, fmin_y)
        max_x = max(max_x, fmax_x - fx0)
        max_y = max(max_y, fmax_y)

    crop_x = max(0, min_x - PAD)          # 格内局部坐标
    crop_y = max(0, min_y - PAD)
    crop_w = min(FRAME_W, max_x + 1 + PAD) - crop_x
    crop_h = min(height, max_y + 1 + PAD) - crop_y
    print(f"公共包围盒（格内）x={crop_x} y={crop_y} w={crop_w} h={crop_h}")
    for f, (bx0, by0, bx1, by1) in enumerate(per_frame_boxes):
        print(f"  第 {f} 帧 相对格子 x {bx0}-{bx1} y {by0}-{by1}")

    # 5) 裁切 + 缩小（按 alpha 加权的 box filter，避免出现灰边）
    out_w = crop_w // DOWNSCALE
    out_h = crop_h // DOWNSCALE
    sheet_w = out_w * frames
    rgba = bytearray(sheet_w * out_h * 4)
    for f in range(frames):
        base_x = f * FRAME_W + crop_x
        for oy in range(out_h):
            for ox in range(out_w):
                sa = sr = sg = sb = 0.0
                for dy in range(DOWNSCALE):
                    y = crop_y + oy * DOWNSCALE + dy
                    row = y * width
                    for dx in range(DOWNSCALE):
                        x = base_x + ox * DOWNSCALE + dx
                        i = row + x
                        a = alpha[i] / 255.0
                        p = i * channels
                        sa += a
                        sr += px[p] * a
                        sg += px[p + 1] * a
                        sb += px[p + 2] * a
                n = DOWNSCALE * DOWNSCALE
                a_avg = sa / n
                o = ((oy * sheet_w) + f * out_w + ox) * 4
                if sa > 0:
                    rgba[o] = int(sr / sa + 0.5)
                    rgba[o + 1] = int(sg / sa + 0.5)
                    rgba[o + 2] = int(sb / sa + 0.5)
                rgba[o + 3] = int(a_avg * 255 + 0.5)

    out_png = ASSETS / f"{job['name']}.png"
    out_json = ASSETS / f"{job['name']}.json"
    out_png.parent.mkdir(parents=True, exist_ok=True)
    write_png(out_png, sheet_w, out_h, rgba)

    meta = {
        "image": out_png.name,
        "frameWidth": out_w,
        "frameHeight": out_h,
        "frames": frames,
        "source": src.name,
        "sourceCellSize": [FRAME_W, height],
        "cropBox": [crop_x, crop_y, crop_w, crop_h],
        "downscale": DOWNSCALE,
        "note": "每格 672x672 的一行动作图，已抠成透明、按公共包围盒对齐。",
    }
    out_json.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"输出 {out_png.relative_to(ROOT)}  {sheet_w}x{out_h}  单帧 {out_w}x{out_h}")
    print(f"输出 {out_json.relative_to(ROOT)}")

    # 6) 打印 ASCII 预览，方便在无图形环境下检查抠图效果
    for f in (0, 4):
        print(f"\n第 {f} 帧预览（# 实心, + 半透明, . 透明）")
        rows, cols = 44, 30
        for ry in range(rows):
            line = ""
            for rx in range(cols):
                x = f * out_w + rx * out_w // cols
                y = ry * out_h // rows
                a = rgba[(y * sheet_w + x) * 4 + 3]
                line += "#" if a > 200 else ("+" if a > 60 else ".")
            print("  " + line)
    return meta


def process_portrait(job: dict) -> dict:
    """2048x2048 卡通半身像 -> 圆形对话头像（深色底 + 黄铜圈）。"""
    src = ROOT / job["src"]
    if not src.exists():
        print(f"找不到源图：{src}", file=sys.stderr)
        return {}

    width, height, channels, colortype, px = read_png(src)
    print(f"\n=== 头像 {src.name}  {width}x{height} ===")
    alpha = cut_background(width, height, channels, px)

    def strong_foreground(x: int, y: int) -> bool:
        """头像里真正属于角色的像素（排除浅灰背景/渐变）"""
        i = y * width + x
        if alpha[i] < 200:
            return False
        p = i * channels
        r, g, b = px[p], px[p + 1], px[p + 2]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        sat = max(r, g, b) - min(r, g, b)
        return lum < 185 or sat > 45

    # 头肩区域（只看上方 62%，避免把地面/背景装饰算进来）
    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(0, int(height * 0.62)):
        for x in range(width):
            if strong_foreground(x, y):
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
    box_w = max_x - min_x + 1
    box_h = max_y - min_y + 1
    print(f"头肩区域 x {min_x}-{max_x} (宽 {box_w}) y {min_y}-{max_y} (高 {box_h})")

    # 头肩比例：这种半身像里脑袋大约占头肩高度的 55%，取景按比例来最稳
    head_h = box_h * 0.55
    diameter = head_h * 1.35 * job.get("diameterScale", 1.0)
    shift_x, shift_y = job.get("centerShift", (0, 0))
    crop_cx = (min_x + max_x) / 2 + shift_x
    crop_cy = min_y + head_h * 0.5 + shift_y
    print(f"圆形取景 中心 ({crop_cx:.0f}, {crop_cy:.0f}) 直径 {diameter:.0f}")

    size = AVATAR_SIZE
    half = size / 2 - 0.5
    ring_w = 4.0
    r_disc = half - ring_w
    r_face = r_disc - 2
    rgba = bytearray(size * size * 4)
    ss = 3  # 3x3 超采样，边缘更干净

    for oy in range(size):
        for ox in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(ss):
                for sx in range(ss):
                    fx = ox + (sx + 0.5) / ss - 0.5
                    fy = oy + (sy + 0.5) / ss - 0.5
                    dx = fx - half
                    dy = fy - half
                    dist = (dx * dx + dy * dy) ** 0.5
                    if dist > half:
                        continue
                    # 外圈黄铜
                    if dist > r_disc:
                        t = (dist - r_disc) / ring_w
                        r, g, b = int(201 + 30 * t), int(164 + 40 * t), int(76 + 40 * t)
                        acc[0] += r
                        acc[1] += g
                        acc[2] += b
                        acc[3] += 255
                        continue
                    # 底盘
                    r, g, b = 36, 26, 18
                    if dist <= r_face:
                        # 映射回原图取角色像素
                        src_x = int(crop_cx + dx / r_face * (diameter / 2))
                        src_y = int(crop_cy + dy / r_face * (diameter / 2))
                        if 0 <= src_x < width and 0 <= src_y < height:
                            i = src_y * width + src_x
                            a = alpha[i] / 255.0
                            p = i * channels
                            r = int(r * (1 - a) + px[p] * a)
                            g = int(g * (1 - a) + px[p + 1] * a)
                            b = int(b * (1 - a) + px[p + 2] * a)
                    acc[0] += r
                    acc[1] += g
                    acc[2] += b
                    acc[3] += 255
            n = ss * ss
            o = (oy * size + ox) * 4
            if acc[3] > 0:
                samples = acc[3] / 255
                rgba[o] = int(acc[0] / samples + 0.5)
                rgba[o + 1] = int(acc[1] / samples + 0.5)
                rgba[o + 2] = int(acc[2] / samples + 0.5)
                rgba[o + 3] = int(min(255, acc[3] / n) + 0.5)

    out_png = ASSETS / f"{job['name']}.png"
    write_png(out_png, size, size, rgba)
    print(f"输出 {out_png.relative_to(ROOT)}  {size}x{size}")

    rows, cols = 34, 34
    print("头像预览（# 角色, . 底色, 空格 透明）")
    for ry in range(rows):
        line = ""
        for rx in range(cols):
            x = rx * size // cols
            y = ry * size // rows
            o = (y * size + x) * 4
            if rgba[o + 3] < 40:
                line += " "
            else:
                lum = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2]
                line += "#" if lum > 130 else "."
        print("  " + line)
    return {"image": out_png.name, "size": size}


def erase_watermark(
    px: bytearray,
    width: int,
    height: int,
    channels: int,
    rect: dict,
    pad: int = 14,
    feather: int = 10,
) -> tuple[int, int, int, int]:
    """用水印正上方同样花色的地面把水印盖掉，四周做羽化过渡。

    水印没法"擦掉"（它已经和画面混在一起了），但这类 AI 背景的地面是低频的
    一片近似纯色，从上面搬一块同样宽高的地面过来、边缝羽化一下，就看不出来了。
    """
    x0 = max(0, rect["x"] - pad)
    y0 = max(0, rect["y"] - pad)
    x1 = min(width, rect["x"] + rect["w"] + pad)
    y1 = min(height, rect["y"] + rect["h"] + pad)
    donor_dy = (y1 - y0) + 12
    original = bytes(px)

    for y in range(y0, y1):
        sy = y - donor_dy
        if sy < 0:
            sy = y + donor_dy  # 上面不够就从下面搬
        if not (0 <= sy < height):
            continue
        for x in range(x0, x1):
            edge = min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y)
            t = min(1.0, edge / feather)
            k = t * t * (3 - 2 * t)  # smoothstep：贴边全用原图，里面全用搬运来的地面
            o = (y * width + x) * channels
            s = (sy * width + x) * channels
            for c in range(min(3, channels)):
                px[o + c] = int(original[o + c] * (1 - k) + original[s + c] * k + 0.5)
    return x0, y0, x1, y1


def to_rgba(px: bytes, width: int, height: int, channels: int) -> bytearray:
    if channels == 4:
        return bytearray(px)
    out = bytearray(width * height * 4)
    for i in range(width * height):
        s = i * channels
        o = i * 4
        out[o] = px[s]
        out[o + 1] = px[s + 1]
        out[o + 2] = px[s + 2]
        out[o + 3] = 255
    return out


def resize_rgba(
    rgba: bytearray, width: int, height: int, out_width: int, out_height: int
) -> bytearray:
    """面积平均缩放：每个输出像素取对应的原图小方块求平均。"""
    out = bytearray(out_width * out_height * 4)
    for oy in range(out_height):
        sy0 = oy * height // out_height
        sy1 = max(sy0 + 1, (oy + 1) * height // out_height)
        for ox in range(out_width):
            sx0 = ox * width // out_width
            sx1 = max(sx0 + 1, (ox + 1) * width // out_width)
            acc = [0, 0, 0, 0]
            n = 0
            for y in range(sy0, sy1):
                row = y * width
                for x in range(sx0, sx1):
                    i = (row + x) * 4
                    acc[0] += rgba[i]
                    acc[1] += rgba[i + 1]
                    acc[2] += rgba[i + 2]
                    acc[3] += rgba[i + 3]
                    n += 1
            o = (oy * out_width + ox) * 4
            for c in range(4):
                out[o + c] = int(acc[c] / n + 0.5)
    return out


def process_background(job: dict) -> dict:
    src = ROOT / job["src"]
    if not src.exists():
        print(f"找不到源图：{src}", file=sys.stderr)
        return {}

    width, height, channels, colortype, px = read_png(src)
    print(f"\n=== 背景 {src.name}  {width}x{height}  通道={channels} ===")

    work = bytearray(px)
    for rect in job.get("watermarks", []):
        box = erase_watermark(work, width, height, channels, rect)
        print(
            f"抹掉水印 x{rect['x']}-{rect['x'] + rect['w']} "
            f"y{rect['y']}-{rect['y'] + rect['h']}（羽化到 {box}）"
        )

    rgba = to_rgba(bytes(work), width, height, channels)
    out_w = job.get("outWidth", width)
    out_h = max(1, round(height * out_w / width))
    if (out_w, out_h) != (width, height):
        rgba = resize_rgba(rgba, width, height, out_w, out_h)

    out_png = ASSETS / f"{job['name']}.png"
    out_png.parent.mkdir(parents=True, exist_ok=True)
    write_png(out_png, out_w, out_h, rgba)
    print(f"输出 {out_png.relative_to(ROOT)}  {out_w}x{out_h}")

    # 抹掉的地方和周围对比一下，肉眼看不见就行
    for rect in job.get("watermarks", []):
        cx = rect["x"] + rect["w"] // 2
        cy = rect["y"] + rect["h"] // 2
        def avg(rx: int, ry: int, size: int = 40) -> list[int]:
            sx = min(max(0, rx), width - size)
            sy = min(max(0, ry), height - size)
            acc = [0, 0, 0]
            for y in range(sy, sy + size):
                for x in range(sx, sx + size):
                    i = (y * width + x) * channels
                    for c in range(3):
                        acc[c] += work[i + c]
            return [a // (size * size) for a in acc]

        inside = avg(cx - 20, cy - 20)
        around = avg(cx - 20, max(0, rect["y"] - 130 - 20))
        print(f"  水印处现在 RGB {inside}，旁边地面 RGB {around}")
    return {"image": out_png.name, "width": out_w, "height": out_h}


def main() -> int:
    for job in SHEETS:
        process_sheet(job)
    for job in PORTRAITS:
        process_portrait(job)
    for job in BACKGROUNDS:
        process_background(job)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
