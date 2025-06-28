import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Keyboard } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { TextElement } from '../types';

interface TextLayerProps {
  element: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextElement>) => void;
}

// Add gesture handling for movement
const TextLayer: React.FC<TextLayerProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentText, setCurrentText] = useState(element.text);
  const [dragStarted, setDragStarted] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  
  // Use a ref to track the most recent text value and prevent it from being overwritten
  const currentTextRef = useRef(element.text);
  
  // Update currentText if element text changes externally
  useEffect(() => {
    // Only update if the text actually changed and is not the default text
    if (element.text !== "Tap to edit" || currentTextRef.current === "Tap to edit") {
      setCurrentText(element.text);
      currentTextRef.current = element.text;
    }
  }, [element.text]);
  
  // Store the initial position and gesture position for calculations
  const [elementPosition, setElementPosition] = useState({ x: element.x, y: element.y });
  
  // Set up shared values for animations
  const scale = useSharedValue(element.scale);
  const fontSize = useSharedValue(element.fontSize);
  const baseFontSize = useRef(element.fontSize);
  const startPosition = useRef({ x: 0, y: 0 });
  
  // Detect problematic position resets (sudden jumps to 150,150)
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
    // Only update position on element ID change (new element)
    setElementPosition({ x: element.x, y: element.y });
  }, [element.id]); 
  
  // Position sync logic with safeguards against unwanted resets
  useEffect(() => {
    // Only sync position when appropriate and avoid default position resets
    const shouldUpdatePosition = (
      // We're unselected and not editing (regular sync)
      (!isSelected && !isEditing) && 
      // AND we're not seeing a problematic reset to default position
      !isDefaultPosition.current
    );
    
    if (shouldUpdatePosition) {
      setElementPosition({ x: element.x, y: element.y });
    }
  }, [element.x, element.y, isSelected, isEditing]);
  
  // Create a drag gesture for moving text
  const dragStartPositionX = useSharedValue(0);
  const dragStartPositionY = useSharedValue(0);
  
  const setDragStartedJS = (started: boolean) => {
    setDragStarted(started);
  };
  
  const updateElementPositionJS = (x: number, y: number) => {
    setElementPosition({ x, y });
  };
  
  const handleEditJS = () => {
    handleEdit();
  };
  
  const finalizePositionJS = (x: number, y: number, distance: number) => {
    if (distance > 5) {
      // ALWAYS use the saved text in currentTextRef to ensure we don't lose edited text
      const textToUse = currentTextRef.current || element.text;
      console.log(`Final text position: x=${x}, y=${y}, preserving text: ${textToUse}`);
      
      // Update the element with the final position AND current saved text
      onUpdate({
        x,
        y,
        text: textToUse
      });
    } else {
      console.log("Movement too small, treating as tap instead of drag");
      
      // If it was a very small movement (like a tap), and the element is already
      // selected, consider treating it as a double-tap for editing
      if (distance < 2) {
        console.log("Small movement on selected element, treating as edit request");
        // Add a small delay to prevent conflicts with other handlers
        setTimeout(() => {
          handleEdit();
        }, 10);
      }
    }
    
    setDragStarted(false);
  };
  
  const dragGesture = Gesture.Pan()
    .enabled(isSelected && !isEditing)
    .onStart(() => {
      console.log("Drag gesture started on text");
      
      // Get the REAL current position, avoiding defaults
      let currentX = elementPosition.x;
      let currentY = elementPosition.y;
      
      // Fix for the position reset issue
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
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      if (isSelected && !isEditing) {
        const movementDistance = Math.sqrt(
          Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
        );
        
        // Only start dragging if movement is significant
        if (movementDistance > 5 || dragStarted) {
          const newX = dragStartPositionX.value + event.translationX;
          const newY = dragStartPositionY.value + event.translationY;
          
          runOnJS(updateElementPositionJS)(newX, newY);
        }
      }
    })
    .onEnd((event) => {
      if (isSelected && !isEditing) {
        const finalX = dragStartPositionX.value + event.translationX;
        const finalY = dragStartPositionY.value + event.translationY;
        
        const movementDistance = Math.sqrt(
          Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
        );
        
        runOnJS(finalizePositionJS)(finalX, finalY, movementDistance);
      }
    });
  
  // Handle selection with position and content preservation
  const handlePress = () => {
    // If already selected, consider a double-tap to enter edit mode
    if (isSelected) {
      console.log("Element already selected, treating as edit request");
      handleEdit();
      return;
    }
    
    // Set a flag to prevent position reset on selection
    const currentPos = {
      x: elementPosition.x,
      y: elementPosition.y
    };
    
    // Ensure we have the latest text content to preserve
    // Use currentTextRef as source of truth for the text content
    const textToPreserve = currentTextRef.current || element.text;
    
    // Select the element
    onSelect();
    
    // Make sure we preserve both position data and text by updating it again
    // This prevents both position resets and text resets on quick taps
    setTimeout(() => {
      console.log(`Preserving element state after selection: pos=(${currentPos.x}, ${currentPos.y}), text="${textToPreserve}"`);
      onUpdate({
        x: currentPos.x,
        y: currentPos.y,
        text: textToPreserve
      });
    }, 50); // Slightly longer delay to ensure proper sequence
  };

  // Handle edit button press
  const handleEdit = () => {
    try {
      console.log("Entering text edit mode");
      
      // Store current text and position before entering edit mode
      currentTextRef.current = element.text;
      setCurrentText(element.text);
      
      // Store position to ensure we don't lose it during editing
      const currentPos = {
        x: elementPosition.x,
        y: elementPosition.y
      };
      setElementPosition(currentPos);
      
      // Enter edit mode
      setIsEditing(true);
      
      // Log the state for debugging
      console.log(`Edit mode activated with text="${element.text}" at position (${currentPos.x}, ${currentPos.y})`);
    } catch (error) {
      console.error("Error when enabling text edit mode:", error);
    }
  };

  // Handle text input change
  const handleChangeText = (newText: string) => {
    try {
      console.log("Text changed to:", newText);
      setCurrentText(newText);
      // Update our ref to track the latest text value
      currentTextRef.current = newText;
    } catch (error) {
      console.error("Error when changing text:", error);
    }
  };

  // Handle finishing editing
  const handleEndEditing = () => {
    try {
      // First, check if we're still in edit mode (guard against duplicate calls)
      if (!isEditing) {
        console.log("handleEndEditing called but not in edit mode, ignoring");
        return;
      }
      
      console.log("Exiting text edit mode, final text:", currentText);
      
      // Save the final text to our ref before dismissing keyboard
      const finalText = currentText || "Text";
      currentTextRef.current = finalText;
      
      // Dismiss the keyboard first
      Keyboard.dismiss();
      
      // Store current position to ensure we don't lose it
      const currentPos = {
        x: elementPosition.x,
        y: elementPosition.y
      };
      
      // Exit edit mode BEFORE updating to prevent render race conditions
      setIsEditing(false);
      
      // Slight delay to ensure keyboard is dismissed and edit mode is fully exited
      setTimeout(() => {
        // Update both text and position at once to prevent race conditions
        console.log(`Updating text element after editing: text="${finalText}", position=(${currentPos.x}, ${currentPos.y})`);
        onUpdate({
          text: finalText,
          x: currentPos.x,
          y: currentPos.y
        });
        
        // Ensure our local state matches what we just sent to parent
        setElementPosition(currentPos);
        
        // Make sure we maintain selection after editing
        onSelect();
      }, 100);
    } catch (error) {
      console.error("Error when ending text editing:", error);
      setIsEditing(false); // Ensure we exit edit mode even on error
      
      // Try to dismiss keyboard even on error
      try {
        Keyboard.dismiss();
      } catch (e) {
        console.error("Failed to dismiss keyboard:", e);
      }
    }
  };
  
  // Update font size when element props change
  useEffect(() => {
    fontSize.value = element.fontSize;
    baseFontSize.current = element.fontSize;
    scale.value = element.scale;
  }, [element.fontSize, element.scale]);

  // Helper functions for pinch gesture
  const setIsResizingJS = (resizing: boolean) => {
    setIsResizing(resizing);
  };
  
  const finalizeFontSizeJS = (finalFontSize: number, finalScale: number) => {
    console.log("Text pinch gesture ended");
    setIsResizing(false);
    
    // Apply changes to parent state
    onUpdate({
      fontSize: finalFontSize,
      scale: finalScale
    });
    
    // Update local state
    fontSize.value = finalFontSize;
  };
  
  // Setup pinch gesture for resizing text
  const pinchGesture = Gesture.Pinch()
    .enabled(isSelected && !isEditing)
    .onStart(() => {
      console.log("Text pinch gesture started");
      runOnJS(setIsResizingJS)(true);
      baseFontSize.current = fontSize.value;
    })
    .onUpdate((e) => {
      if (isSelected && !isEditing) {
        // Update font size based on pinch scale
        const newFontSize = baseFontSize.current * e.scale;
        fontSize.value = newFontSize;
      }
    })
    .onEnd((e) => {
      if (isSelected && !isEditing) {
        // Calculate final font size
        const finalFontSize = Math.max(8, Math.min(72, baseFontSize.current * e.scale));
        const finalScale = element.scale * e.scale;
        
        runOnJS(finalizeFontSizeJS)(finalFontSize, finalScale);
      }
    });

  // Set up rotation gesture
  const rotationValue = useSharedValue(element.rotation);
  const baseRotationValue = useRef(element.rotation);
  
  // Update rotation when element props change
  useEffect(() => {
    rotationValue.value = element.rotation;
    baseRotationValue.current = element.rotation;
  }, [element.rotation]);
  
  const setIsRotatingJS = (rotating: boolean) => {
    setIsRotating(rotating);
  };
  
  const finalizeRotationJS = (finalRotation: number) => {
    console.log("Text rotation gesture ended");
    setIsRotating(false);
    
    // Apply changes to parent state
    onUpdate({
      rotation: finalRotation
    });
  };
  
  // Setup rotation gesture
  const rotationGesture = Gesture.Rotation()
    .enabled(isSelected && !isEditing)
    .onStart(() => {
      console.log("Text rotation gesture started");
      baseRotationValue.current = rotationValue.value;
      runOnJS(setIsRotatingJS)(true);
    })
    .onUpdate((e) => {
      if (isSelected && !isEditing) {
        rotationValue.value = baseRotationValue.current + e.rotation;
      }
    })
    .onEnd((e) => {
      if (isSelected && !isEditing) {
        const finalRotation = baseRotationValue.current + e.rotation;
        runOnJS(finalizeRotationJS)(finalRotation);
      }
    });
    
  // Combine all gestures
  const combinedGestures = Gesture.Simultaneous(
    pinchGesture,
    rotationGesture,
    dragGesture
  );

  // Create animated style for the text
  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      fontSize: fontSize.value,
      fontFamily: element.fontFamily,
      fontWeight: element.fontStyle === 'bold' ? 'bold' : 'normal',
      color: element.color,
    };
  });
  
  // Create animated style for the container with rotation
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotationValue.value}rad` }
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
        },
        isSelected && styles.selected
      ]}
    >
      {isEditing ? (
        // Edit mode
        <View style={styles.editContainer}>
          <TextInput
            style={[
              styles.textInput,
              {
                fontSize: element.fontSize,
                color: element.color,
              }
            ]}
            value={currentText}
            onChangeText={handleChangeText}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            onSubmitEditing={handleEndEditing}
            autoFocus={true}
            multiline={true}
            blurOnSubmit={true}
            returnKeyType="done"
            keyboardType="default"
            selectTextOnFocus={true}
          />
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={handleEndEditing}
            activeOpacity={0.4}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Display mode
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GestureDetector gesture={combinedGestures}>
            <Animated.View style={[styles.animatedContainer, animatedContainerStyle]}>
              <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
                <Animated.Text style={[styles.text, animatedTextStyle]}>
                  {element.text || 'Text'}
                </Animated.Text>
                
                {isSelected && (
                  <View style={styles.controlsContainer}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={handleEdit}
                      activeOpacity={0.4}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                      <Text style={styles.buttonText}>Edit Text</Text>
                    </TouchableOpacity>
                    <Text style={styles.dragText}>
                      {isResizing ? 'Resizing...' : 
                      isRotating ? 'Rotating...' :
                      dragStarted ? 'Moving...' : 
                      'Double tap to edit • Drag to move • Pinch to resize • Rotate with two fingers'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </GestureDetector>
        </GestureHandlerRootView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    padding: 10,
    minWidth: 50,
    minHeight: 30,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  animatedContainer: {
    width: '100%',
    height: '100%',
  },
  selected: {
    borderWidth: 1,
    borderColor: 'blue',
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  doneButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'green',
    borderRadius: 4,
    alignItems: 'center',
    width: '80%',
    alignSelf: 'center',
  },
  text: {
    textAlign: 'center',
  },
  editContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0078ff',
    minWidth: 150,
  },
  textInput: {
    minWidth: 150,
    minHeight: 40,
    padding: 8,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 3,
    backgroundColor: '#f8f8f8',
  },
  controlsContainer: {
    marginTop: 5,
    alignItems: 'center',
  },
  editButton: {
    marginTop: 8,
    padding: 5,
    backgroundColor: '#0078ff',
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dragText: {
    fontSize: 10,
    color: '#555',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default TextLayer;