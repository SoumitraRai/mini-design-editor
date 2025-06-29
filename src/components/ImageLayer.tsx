import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Image, TouchableOpacity, View, Text } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { ImageElement } from '../types';

interface ImageLayerProps {
  element: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageElement>) => void;
}
const ImageLayer: React.FC<ImageLayerProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
}) => {
  const [dragStarted, setDragStarted] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const [elementPosition, setElementPosition] = useState({ x: element.x, y: element.y });
  const [elementSize, setElementSize] = useState({ width: element.width, height: element.height });
  const startPosition = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: element.width, height: element.height });
  
  const scale = useSharedValue(element.scale);
  const baseScale = useRef(element.scale);
  
  const rotation = useSharedValue(element.rotation);
  const baseRotation = useRef(element.rotation);
  
  const isDefaultPosition = useRef(false);
  useEffect(() => {
    if (element.x === 150 && element.y === 150) {
      isDefaultPosition.current = true;
    } else {
      isDefaultPosition.current = false;
    }
  }, [element.x, element.y]);
  
  
  useEffect(() => {
    setElementPosition({ x: element.x, y: element.y });
  }, [element.id]); 
  
  
  useEffect(() => {
    const shouldUpdatePosition = (
      !isSelected && 
      !isDefaultPosition.current
    );
    
    if (shouldUpdatePosition) {
      setElementPosition({ x: element.x, y: element.y });
    }
  }, [element.x, element.y, isSelected]);
  
  useEffect(() => {
    setElementSize({ width: element.width, height: element.height });
    scale.value = element.scale;
    baseScale.current = element.scale;
  }, [element.width, element.height, element.scale]);
  
  const handlePress = () => {
    const currentPos = {
      x: elementPosition.x,
      y: elementPosition.y
    };
    
    onSelect();
    
    setTimeout(() => {
      console.log(`Keeping our image right where it was at (${currentPos.x}, ${currentPos.y})`);
      onUpdate({
        x: currentPos.x,
        y: currentPos.y
      });
    }, 50);
  };
  
  // Create a drag gesture for moving the image
  const dragStartPositionX = useSharedValue(0);
  const dragStartPositionY = useSharedValue(0);
  
  const setIsMovingJS = (moving: boolean) => {
    setIsMoving(moving);
  };
  
  const setDragStartedJS = (started: boolean) => {
    setDragStarted(started);
  };
  
  const updateElementPositionJS = (x: number, y: number) => {
    setElementPosition({ x, y });
  };
  
  const finalizePositionJS = (x: number, y: number, distance: number) => {
    if (distance > 3) {
      console.log(`Final image position: x=${x}, y=${y}`);
      onUpdate({
        x,
        y
      });
    } else {
      console.log("Movement too small, treating as tap instead of drag");
    }
    
    setDragStarted(false);
    setIsMoving(false);
  };
  
  const dragGesture = Gesture.Pan()
    .enabled(isSelected)
    .onStart(() => {
      console.log("Starting to drag this image around");
      
      let currentX = elementPosition.x;
      let currentY = elementPosition.y;
      
      if (currentX === 150 && currentY === 150) {
        if (element.x !== 150 || element.y !== 150) {
          currentX = element.x;
          currentY = element.y;
          
          runOnJS(updateElementPositionJS)(currentX, currentY);
          console.log(`Not today, position reset! Using the real position: x=${currentX}, y=${currentY}`);
        }
      }
      
      dragStartPositionX.value = currentX;
      dragStartPositionY.value = currentY;
      
      runOnJS(setDragStartedJS)(true);
      runOnJS(setIsMovingJS)(true);
    })
    .onUpdate((event) => {
      if (isSelected) {
        const newX = dragStartPositionX.value + event.translationX;
        const newY = dragStartPositionY.value + event.translationY;
        
        runOnJS(updateElementPositionJS)(newX, newY);
      }
    })
    .onEnd((event) => {
      if (isSelected) {
        const finalX = dragStartPositionX.value + event.translationX;
        const finalY = dragStartPositionY.value + event.translationY;
        
        const movementDistance = Math.sqrt(
          Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
        );
        
        runOnJS(finalizePositionJS)(finalX, finalY, movementDistance);
      }
    });

  // Helper functions for runOnJS callbacks
  const setIsResizingJS = (resizing: boolean) => {
    setIsResizing(resizing);
  };
  
  const updateElementSizeJS = (width: number, height: number) => {
    setElementSize({ width, height });
  };
  
  const finalizeResizeJS = (newScale: number, newWidth: number, newHeight: number) => {
    console.log("Pinch gesture ended");
    setIsResizing(false);
    
    onUpdate({
      width: newWidth,
      height: newHeight,
      scale: newScale
    });
  };
  
  const pinchGesture = Gesture.Pinch()
    .enabled(isSelected)
    .onStart(() => {
      console.log("Pinching to resize the image");
      runOnJS(setIsResizingJS)(true);
      startSize.current = { 
        width: elementSize.width, 
        height: elementSize.height 
      };
      baseScale.current = scale.value;
    })
    .onUpdate((e) => {
      if (isSelected) {
        const newScale = baseScale.current * e.scale;
        scale.value = newScale;
        
        const newWidth = startSize.current.width * e.scale;
        const newHeight = startSize.current.height * e.scale;
        
        runOnJS(updateElementSizeJS)(newWidth, newHeight);
      }
    })
    .onEnd((e) => {
      if (isSelected) {
        const finalScale = baseScale.current * e.scale;
        const finalWidth = startSize.current.width * e.scale;
        const finalHeight = startSize.current.height * e.scale;
        
        runOnJS(finalizeResizeJS)(finalScale, finalWidth, finalHeight);
      }
    });

  const finalizeRotationJS = (finalRotation: number) => {
    console.log("Rotation gesture ended");
    
    onUpdate({
      rotation: finalRotation
    });
  };
  
  const [isRotating, setIsRotating] = useState(false);
  const setIsRotatingJS = (rotating: boolean) => {
    setIsRotating(rotating);
  };
  
  const rotationGesture = Gesture.Rotation()
    .enabled(isSelected)
    .onStart(() => {
      console.log("Starting to spin this image around");
      baseRotation.current = rotation.value;
      runOnJS(setIsRotatingJS)(true);
    })
    .onUpdate((e) => {
      if (isSelected) {
        rotation.value = baseRotation.current + e.rotation;
      }
    })
    .onEnd((e) => {
      if (isSelected) {
        const finalRotation = baseRotation.current + e.rotation;
        runOnJS(setIsRotatingJS)(false);
        runOnJS(finalizeRotationJS)(finalRotation);
      }
    });
    
  const combinedGestures = Gesture.Simultaneous(
    pinchGesture,
    rotationGesture,
    dragGesture
  );

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}rad` }
      ]
    };
  });

  return (
    <View
      style={[
        styles.container,
        {
          left: elementPosition.x,
          top: elementPosition.y,
          width: elementSize.width,
          height: elementSize.height,
        },
        isSelected && styles.selected
      ]}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={combinedGestures}>
          <Animated.View style={[styles.animatedContainer, animatedImageStyle]}>
            <TouchableOpacity onPress={handlePress} style={styles.touchable}>
              <Image
                source={{ uri: element.uri }}
                style={styles.image}
                resizeMode="cover"
              />
              {isSelected && (
                <View style={styles.moveIndicator}>
                  <Text style={styles.moveText}>
                    {isResizing ? 'Resizing...' : 
                    isRotating ? 'Rotating...' :
                    isMoving ? 'Moving...' : 
                    'Drag to move • Pinch to resize • Rotate with two fingers'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 5,
  },
  animatedContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  selected: {
    borderWidth: 2,
    borderColor: 'blue',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  touchable: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  moveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 4,
    alignItems: 'center',
  },
  moveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  resizeHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'blue',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ImageLayer;