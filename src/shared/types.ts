export interface Point {
  x: number;
  y: number;
}
export interface Node extends Point {
  in: Point;
  out: Point;
}
export interface Shape {
  id: string;
  name: string;
  nodes: Node[];
  closed: boolean;
  fill: string;
  stroke: string;
  width: number;
  opacity: number;
  group?: string;
}

/** 单个副本相对其规则槽位的例外调整（以源图形坐标系为基准） */
export interface InstanceException {
  /** 槽位标识：路径/环形为线性序号，二维网格为 "列,行" */
  slot: string;
  dx: number;
  dy: number;
  rotation: number;
  scale: number;
  hidden?: boolean;
}

interface RepeaterBase {
  id: string;
  name: string;
  /** 被重复的源图形 id，源图形改动会实时反映到所有副本 */
  sourceId: string;
  /** 路径/环形的副本数量；网格用 cols × rows 推导，count 保留作缓存 */
  count: number;
  /** 朝向：副本额外旋转角（度），路径/环形在切线跟随之外叠加 */
  orientation: number;
  follow: boolean;
  exceptions: InstanceException[];
}

export interface PathRepeater extends RepeaterBase {
  type: "path";
  /** 作为排布轨道的图形 id，按弧长分配副本位置 */
  guideId: string;
  /** 相邻副本的弧长间距 */
  spacing: number;
  /** 距轨道起点的弧长偏移 */
  offset: number;
  /** 末端不足一个整步时：blank 留空 / fit 调整间距铺满 */
  remainder: "blank" | "fit";
}

export interface RingRepeater extends RepeaterBase {
  type: "ring";
  cx: number;
  cy: number;
  radius: number;
  /** 起始角（度） */
  startAngle: number;
  /** 总扫掠角（度），360 表示闭合整环 */
  sweep: number;
}

export interface GridRepeater extends RepeaterBase {
  type: "grid";
  /** 网格中心 */
  cx: number;
  cy: number;
  cols: number;
  rows: number;
  spacingX: number;
  spacingY: number;
  /** 网格整体旋转角（度） */
  rotation: number;
}

export type Repeater = PathRepeater | RingRepeater | GridRepeater;

/** 当前选中的虚拟副本（区别于真实图形的选择） */
export interface InstanceSelection {
  repeaterId: string;
  slot: string;
}

export interface Document {
  shapes: Shape[];
  repeaters: Repeater[];
  selected: string[];
  selectedRepeater: string | null;
  selectedInstance: InstanceSelection | null;
  tool: string;
  zoom: number;
}
