import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, ActivityIndicator, Keyboard } from 'react-native';
import { CanvasElementType, TextElement, ImageElement, ShapeElement } from '../types';
import TextLayer from './TextLayer';
import ImageLayer from './ImageLayer';
import ShapeLayer from './ShapeLayer';
import ViewShot from 'react-native-view-shot';

export interface CanvasRef {
  capture: () => Promise<string>;
}

interface CanvasProps {
  elements: CanvasElementType[];
  onElementSelect: (id: string) => void;
  onElementUpdate: (id: string, updates: Partial<CanvasElementType>) => void;
  selectedElementId: string | null;
  onCanvasLayout?: (width: number, height: number) => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(
  ({ elements, onElementSelect, onElementUpdate, selectedElementId, onCanvasLayout }, ref) => {
    const viewShotRef = useRef<any>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    
    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (!viewShotRef.current) {
          throw new Error("ViewShot reference not available");
        }
        
        try {
          setIsCapturing(true);
          
          const tempSelectedId = selectedElementId;
          onElementSelect('');
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const uri = await viewShotRef.current.capture({
            format: 'png',
            quality: 1,
            result: 'data-uri'
          });
          
          console.log("Canvas captured successfully, URI length:", uri?.length);
          
          setTimeout(() => {
            if (tempSelectedId) {
              onElementSelect(tempSelectedId);
            }
            setIsCapturing(false);
          }, 100);
          
          return uri;
        } catch (error) {
          console.error("Failed to capture canvas:", error);
          setIsCapturing(false);
          throw error;
        }
      }
    }));

    const handleBackgroundPress = () => {
      const isKeyboardVisible = Keyboard.isVisible && Keyboard.isVisible();
      
      if (isKeyboardVisible) {
        console.log("Someone's typing! Let's not interrupt them by deselecting.");
        return;
      }
      
      Keyboard.dismiss();
      
      setTimeout(() => {
        onElementSelect('');
      }, 150);
    };

    const textElements = elements.filter((el): el is TextElement => el.type === 'text');
    const imageElements = elements.filter((el): el is ImageElement => el.type === 'image');
    const shapeElements = elements.filter((el): el is ShapeElement => el.type === 'shape');

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
    
    if (onCanvasLayout) {
      onCanvasLayout(width, height);
    }
  };
    
    return (
      <ViewShot
        ref={viewShotRef}
        style={styles.canvas}
        onLayout={handleLayout}
        options={{ 
          quality: 1, 
          format: 'png',
          result: 'tmpfile',
          fileName: `design-${Date.now()}.png` 
        }}
      >
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
          <View style={styles.canvasBackground} />
        </TouchableWithoutFeedback>
        
        {shapeElements.map(element => (
          <ShapeLayer
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId && !isCapturing}
            onSelect={() => onElementSelect(element.id)}
            onUpdate={(updates) => onElementUpdate(element.id, updates)}
          />
        ))}
        
        {imageElements.map(element => (
          <ImageLayer
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId && !isCapturing}
            onSelect={() => onElementSelect(element.id)}
            onUpdate={(updates) => onElementUpdate(element.id, updates)}
          />
        ))}
        
        {textElements.map(element => (
          <TextLayer
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId && !isCapturing}
            onSelect={() => onElementSelect(element.id)}
            onUpdate={(updates) => onElementUpdate(element.id, updates)}
          />
        ))}
        
        {isCapturing && (
          <View style={styles.capturingIndicator}>
            <ActivityIndicator size="large" color="#0078ff" />
          </View>
        )}
      </ViewShot>
    );
  }
);

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  canvasBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  capturingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});

export default Canvas;