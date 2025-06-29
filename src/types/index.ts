
export type ElementType = 'text' | 'image' | 'shape';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
}

export interface TextElement extends CanvasElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  color: string;
}

export interface ImageElement extends CanvasElement {
  type: 'image';
  uri: string;
}

export interface ShapeElement extends CanvasElement {
  type: 'shape';
  shapeType: 'circle' | 'triangle' | 'star';
  color: string;
}


export type CanvasElementType = TextElement | ImageElement | ShapeElement;