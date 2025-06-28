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

// Add gesture handling for movement and resizing
const ImageLayer: React.FC<ImageLayerProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
}) => {
  const [dragStarted, setDragStarted] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Store element position as local state
  const [elementPosition, setElementPosition] = useState({ x: element.x, y: element.y });
  const [elementSize, setElementSize] = useState({ width: element.width, height: element.height });
  const startPosition = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: element.width, height: element.height });
  
  // Shared values for animations
  const scale = useSharedValue(element.scale);
  const baseScale = useRef(element.scale);
  
  // Shared value for rotation
  const rotation = useSharedValue(element.rotation);
  const baseRotation = useRef(element.rotation);
  
  // Detect problematic position resets
  const isDefaultPosition = useRef(false);
  useEffect(() => {
    // Check if this is a reset to the default position
    if (element.x === 150 && element.y === 150) {
      isDefaultPosition.current = true;
    } else {
      isDefaultPosition.current = false;
    }
  }, [element.x, element.y]);
  
  // Update the position when element props change from parent
  // This keeps our local state in sync with props when needed
  useEffect(() => {
    // Update position when element coordinates change from parent
    setElementPosition({ x: element.x, y: element.y });
  }, [element.id]); // Only update when element ID changes (i.e., different element)
  
  // Position sync logic with safeguards against unwanted resets
  useEffect(() => {
    // Only sync position when appropriate and avoid default position resets
    const shouldUpdatePosition = (
      // We're unselected (regular sync)
      !isSelected && 
      // AND we're not seeing a problematic reset to default position
      !isDefaultPosition.current
    );
    
    if (shouldUpdatePosition) {
      setElementPosition({ x: element.x, y: element.y });
    }
  }, [element.x, element.y, isSelected]);
  
  // Update size when element props change
  useEffect(() => {
    setElementSize({ width: element.width, height: element.height });
    scale.value = element.scale;
    baseScale.current = element.scale;
  }, [element.width, element.height, element.scale]);
  
  // Handle selection with position preservation
  const handlePress = () => {
    // Set a flag to prevent position reset on selection
    const currentPos = {
      x: elementPosition.x,
      y: elementPosition.y
    };
    
    // Select the element
    onSelect();
    
    // Make sure we preserve the position data by updating it again
    // This prevents position resets on quick taps
    setTimeout(() => {
      console.log(`Preserving image position after selection: (${currentPos.x}, ${currentPos.y})`);
      onUpdate({
        x: currentPos.x,
        y: currentPos.y
      });
    }, 50); // Slightly longer delay to ensure proper sequence
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
      console.log("Drag gesture started on image");
      
      // Get the REAL current position, avoiding defaults
      let currentX = elementPosition.x;
      let currentY = elementPosition.y;
      
      // Fix for the position reset issue - never allow the default position
      // to override a valid position during dragging
      if (currentX === 150 && currentY === 150) {
        if (element.x !== 150 || element.y !== 150) {
          currentX = element.x;
          currentY = element.y;
          
          runOnJS(updateElementPositionJS)(currentX, currentY);
          console.log(`Avoiding position reset, using saved position: x=${currentX}, y=${currentY}`);
        }
      }
      
      // Store the position for drag calculations
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
    
    // Apply changes to parent state
    onUpdate({
      width: newWidth,
      height: newHeight,
      scale: newScale
    });
  };
  
  // Setup pinch gesture for resizing
  const pinchGesture = Gesture.Pinch()
    .enabled(isSelected)
    .onStart(() => {
      console.log("Pinch gesture started");
      runOnJS(setIsResizingJS)(true);
      startSize.current = { 
        width: elementSize.width, 
        height: elementSize.height 
      };
      baseScale.current = scale.value;
    })
    .onUpdate((e) => {
      if (isSelected) {
        // Update scale based on pinch
        const newScale = baseScale.current * e.scale;
        scale.value = newScale;
        
        // Calculate new dimensions based on scale
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

  // Helper function for rotation completion
  const finalizeRotationJS = (finalRotation: number) => {
    console.log("Rotation gesture ended");
    
    // Apply changes to parent state
    onUpdate({
      rotation: finalRotation
    });
  };
  
  // Track rotation state for UI feedback
  const [isRotating, setIsRotating] = useState(false);
  const setIsRotatingJS = (rotating: boolean) => {
    setIsRotating(rotating);
  };
  
  // Setup rotation gesture
  const rotationGesture = Gesture.Rotation()
    .enabled(isSelected)
    .onStart(() => {
      console.log("Rotation gesture started");
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
    
  // Combine all gestures
  const combinedGestures = Gesture.Simultaneous(
    pinchGesture,
    rotationGesture,
    dragGesture
  );

  // Create animated style for the image container
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