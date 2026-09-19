/**
 * 手机模式的横屏处理。
 * 浏览器只有在全屏 + 用户手势的情况下才允许锁定方向，所以这里是"能锁就锁，
 * 锁不了就靠 index.html 里那块 #rotate-hint 提示玩家把手机横过来"。
 */

export async function requestLandscape() {
  const el = document.getElementById('game-root') || document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    /* iOS / 部分浏览器不支持，忽略 */
  }
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch {
    /* 同上 */
  }
}

/** 手机模式 + 竖屏时盖一层"请横屏"的提示 */
export function watchOrientation() {
  const hint = document.getElementById('rotate-hint');
  if (!hint) return;

  const update = () => {
    const mode = window.game?.registry?.get('inputMode');
    const portrait = window.innerHeight > window.innerWidth;
    hint.style.display = mode === 'mobile' && portrait ? 'flex' : 'none';
  };

  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  update();
  return update;
}
