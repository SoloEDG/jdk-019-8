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
export interface Document {
  shapes: Shape[];
  selected: string[];
  tool: string;
  zoom: number;
}
