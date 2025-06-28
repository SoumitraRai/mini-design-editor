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

// Simplified Canvas component
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
          
          // Ensure we deselect any element before capturing
          const tempSelectedId = selectedElementId;
          onElementSelect('');
          
          // Small delay to ensure UI updates before capture
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Capture the canvas with improved settings
          const uri = await viewShotRef.current.capture({
            format: 'png',
            quality: 1,
            result: 'data-uri'
          });
          
          console.log("Canvas captured successfully, URI length:", uri?.length);
          
          // Restore selection after a small delay
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
      // We need to check if any element is in text edit mode before deselecting
      // This is a safety check to prevent interrupting text editing
      
      // First look through all text elements to see if any are in edit mode
      // We can't directly access their state, but we can check if keyboard is visible
      const isKeyboardVisible = Keyboard.isVisible && Keyboard.isVisible();
      
      if (isKeyboardVisible) {
        console.log("Keyboard is visible, likely editing text. Ignoring background press.");
        return; // Don't deselect if keyboard is visible (editing text)
      }
      
      // If not editing text, dismiss keyboard
      Keyboard.dismiss();
      
      // Deselect all elements when background is pressed
      // Using setTimeout to ensure this doesn't interfere with other touch events
      setTimeout(() => {
        onElementSelect('');
      }, 150); // Slightly longer delay to ensure keyboard dismissal completes
    };

    // Safely get typed elements
    const textElements = elements.filter((el): el is TextElement => el.type === 'text');
    const imageElements = elements.filter((el): el is ImageElement => el.type === 'image');
    const shapeElements = elements.filter((el): el is ShapeElement => el.type === 'shape');

    // Handle layout changes to detect canvas size
    const handleLayout = (event: any) => {
      const { width, height } = event.nativeEvent.layout;
      setCanvasSize({ width, height });
      
      // Pass dimensions to parent component if callback exists
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
        
        {/* Render shape elements first (lowest z-index) */}
        {shapeElements.map(element => (
          <ShapeLayer
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId && !isCapturing}
            onSelect={() => onElementSelect(element.id)}
            onUpdate={(updates) => onElementUpdate(element.id, updates)}
          />
        ))}
        
        {/* Render image elements next (middle z-index) */}
        {imageElements.map(element => (
          <ImageLayer
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId && !isCapturing}
            onSelect={() => onElementSelect(element.id)}
            onUpdate={(updates) => onElementUpdate(element.id, updates)}
          />
        ))}
        
        {/* Render text elements (highest z-index) */}
        {textElements.map(element => (
          <TextLayer
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId && !isCapturing}
            onSelect={() => onElementSelect(element.id)}
            onUpdate={(updates) => onElementUpdate(element.id, updates)}
          />
        ))}
        
        {/* Show loading indicator while capturing */}
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