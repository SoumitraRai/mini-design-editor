import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { ShapeElement } from '../types';

interface ShapeLayerProps {
  element: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ShapeElement>) => void;
}

const ShapeLayer: React.FC<ShapeLayerProps> = ({
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
      !isSelected && !isDefaultPosition.current
    );
    
    if (shouldUpdatePosition) {
      setElementPosition({ x: element.x, y: element.y });
    }
  }, [element.x, element.y, isSelected]);
  
  useEffect(() => {
    setElementSize({ width: element.width, height: element.height });
    scale.value = element.scale;
    baseScale.current = element.scale;
    rotation.value = element.rotation;
    baseRotation.current = element.rotation;
  }, [element.width, element.height, element.scale, element.rotation]);
  
  const handlePress = () => {
    const currentPos = {
      x: elementPosition.x,
      y: elementPosition.y
    };
    
    onSelect();
    
    setTimeout(() => {
      console.log(`Keeping our shape exactly at (${currentPos.x}, ${currentPos.y})`);
      onUpdate({
        x: currentPos.x,
        y: currentPos.y
      });
    }, 50);
  };
  
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
      console.log(`Final shape position: x=${x}, y=${y}`);
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
      console.log("Drag gesture started on shape");
      
      let currentX = elementPosition.x;
      let currentY = elementPosition.y;
      
      if (currentX === 150 && currentY === 150) {
        if (element.x !== 150 || element.y !== 150) {
          currentX = element.x;
          currentY = element.y;
          
          runOnJS(updateElementPositionJS)(currentX, currentY);
          console.log(`Avoiding position reset, using saved position: x=${currentX}, y=${currentY}`);
        }
      }
      
      dragStartPositionX.value = currentX;
      dragStartPositionY.value = currentY;
      
      runOnJS(setDragStartedJS)(true);
      runOnJS(setIsMovingJS)(true);
      runOnJS(onSelect)();
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

  const pinchGesture = Gesture.Pinch()
    .enabled(isSelected)
    .onStart(() => {
      console.log("Pinching to resize this shape");
      setIsResizing(true);
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
        
        setElementSize({
          width: newWidth,
          height: newHeight
        });
      }
    })
    .onEnd((e) => {
      if (isSelected) {
        console.log("Done resizing the shape");
        setIsResizing(false);
        

        const finalScale = baseScale.current * e.scale;
        const finalWidth = startSize.current.width * e.scale;
        const finalHeight = startSize.current.height * e.scale;
        
        onUpdate({
          width: finalWidth,
          height: finalHeight,
          scale: finalScale
        });
      }
    });


  const [isRotating, setIsRotating] = useState(false);
  const setIsRotatingJS = (rotating: boolean) => {
    setIsRotating(rotating);
  };
  
  const finalizeRotationJS = (finalRotation: number) => {
    console.log("Shape rotation gesture ended");
    setIsRotating(false);
    
    // Apply changes to parent state
    onUpdate({
      rotation: finalRotation
    });
  };
  

  const rotationGesture = Gesture.Rotation()
    .enabled(isSelected)
    .onStart(() => {
      console.log("Shape rotation gesture started");
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
        runOnJS(finalizeRotationJS)(finalRotation);
      }
    });
    

  const combinedGestures = Gesture.Simultaneous(
    pinchGesture, 
    rotationGesture,
    dragGesture
  );


  const animatedShapeStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value}rad` }
      ]
    };
  });
  

  const renderShape = () => {
    switch (element.shapeType) {
      case 'circle':
        return (
          <View style={[
            styles.circle, 
            { 
              backgroundColor: element.color,
              width: '100%',
              height: '100%',
            }
          ]} />
        );
        
      case 'triangle':
        return (
          <View style={[
            styles.triangle, 
            { 
              borderBottomColor: element.color,
              borderBottomWidth: elementSize.height,
              borderLeftWidth: elementSize.width / 2,
              borderRightWidth: elementSize.width / 2,
            }
          ]} />
        );
        
      case 'star':
        return (
          <View style={styles.starContainer}>
            <View style={[
              styles.star, 
              { 
                backgroundColor: element.color,
                width: '100%',
                height: '100%',
              }
            ]} />
          </View>
        );
        
      default:
        return (
          <View style={[
            styles.defaultShape,
            { backgroundColor: element.color }
          ]} />
        );
    }
  };

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
          <Animated.View 
            style={[styles.animatedContainer, animatedShapeStyle]}
          >
          <TouchableOpacity onPress={handlePress} style={styles.touchable}>
            {renderShape()}
            
            {isSelected && (
              <View style={styles.moveIndicator}>
                <Text style={styles.moveText}>
                  {isResizing ? 'Pinch to resize' : 
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
    justifyContent: 'center',
    alignItems: 'center',
  },

  circle: {
    borderRadius: 999,
    width: '100%',
    height: '100%',
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  starContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    width: '100%',
    height: '100%',
    backgroundColor: 'yellow',
    borderRadius: 8,
  },
  defaultShape: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
});

export default ShapeLayer;
