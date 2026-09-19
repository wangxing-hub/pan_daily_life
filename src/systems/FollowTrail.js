/**
 * 面包屑跟随：记录领队走过的点，跟随者始终朝着
 * 「沿轨迹往回数 distance 像素」的那个点走 —— 拐弯也会跟着拐。
 */
export default class FollowTrail {
  constructor(follower, params) {
    this.follower = follower;
    this.params = params;
    this.points = [];
    this.stuckTime = 0;
    this.lastPos = { x: follower.x, y: follower.y };
  }

  /** 初始化：从跟随者当前位置到领队拉一条直线作为轨迹起点 */
  reset(leader) {
    const { crumb } = this.params;
    const gap = Phaser.Math.Distance.Between(
      this.follower.x,
      this.follower.y,
      leader.x,
      leader.y
    );
    const steps = Math.max(1, Math.ceil(gap / crumb));
    this.points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.points.push({
        x: this.follower.x + (leader.x - this.follower.x) * t,
        y: this.follower.y + (leader.y - this.follower.y) * t,
      });
    }
    this.lastPos = { x: this.follower.x, y: this.follower.y };
    this.stuckTime = 0;
  }

  /** 沿轨迹从领队位置往回数 distance 像素 */
  pointBehind(leader, distance) {
    if (!this.points.length) return { x: leader.x, y: leader.y };
    let acc = 0;
    for (let i = this.points.length - 1; i > 0; i--) {
      const a = this.points[i];
      const b = this.points[i - 1];
      const seg = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (acc + seg >= distance) {
        const t = seg > 0 ? (distance - acc) / seg : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      acc += seg;
    }
    return { x: this.points[0].x, y: this.points[0].y };
  }

  update(leader, delta) {
    const follower = this.follower;
    const p = this.params;

    // 1) 记录领队的位置
    const last = this.points[this.points.length - 1];
    if (!last || Phaser.Math.Distance.Between(last.x, last.y, leader.x, leader.y) >= p.crumb) {
      this.points.push({ x: leader.x, y: leader.y });
      if (this.points.length > 900) this.points.shift();
    }

    // 2) 朝目标点走
    const target = this.pointBehind(leader, p.distance);
    const gap = Phaser.Math.Distance.Between(follower.x, follower.y, leader.x, leader.y);

    // 领队主动走过来时（两人已经比跟随距离更近），原地等着，
    // 不然她会一直绕到领队背后，玩家永远没法面对面和她说话
    if (gap < p.distance * 0.92) {
      follower.walkTo(follower.x, follower.y, 0, delta);
      this.lastPos = { x: follower.x, y: follower.y };
      this.stuckTime = 0;
      return;
    }

    const speed = gap > p.catchUpDistance ? p.catchUpSpeed : p.speed;
    follower.walkTo(target.x, target.y, speed, delta);

    // 3) 卡太久就归队
    const moved = Phaser.Math.Distance.Between(
      follower.x,
      follower.y,
      this.lastPos.x,
      this.lastPos.y
    );
    const wantsToMove =
      Phaser.Math.Distance.Between(follower.x, follower.y, target.x, target.y) > 20;
    if (wantsToMove && moved < 0.4) {
      this.stuckTime += delta;
      if (this.stuckTime > 2500) {
        follower.setPosition(target.x, target.y);
        this.stuckTime = 0;
      }
    } else {
      this.stuckTime = 0;
    }
    this.lastPos = { x: follower.x, y: follower.y };
  }
}
