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
  
  const currentTextRef = useRef(element.text);
  
  useEffect(() => {
    if (element.text !== "Tap to edit" || currentTextRef.current === "Tap to edit") {
      setCurrentText(element.text);
      currentTextRef.current = element.text;
    }
  }, [element.text]);
  
  const [elementPosition, setElementPosition] = useState({ x: element.x, y: element.y });
  
  const scale = useSharedValue(element.scale);
  const fontSize = useSharedValue(element.fontSize);
  const baseFontSize = useRef(element.fontSize);
  const startPosition = useRef({ x: 0, y: 0 });
  
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
      (!isSelected && !isEditing) && 
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
      const textToUse = currentTextRef.current || element.text;
      console.log(`Final text position: x=${x}, y=${y}, preserving text: ${textToUse}`);
      
      onUpdate({
        x,
        y,
        text: textToUse
      });
    } else {
      console.log("Movement too small, treating as tap instead of drag");
      
      if (distance < 2) {
        console.log("Small movement on selected element, treating as edit request");
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
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      if (isSelected && !isEditing) {
        const movementDistance = Math.sqrt(
          Math.pow(event.translationX, 2) + Math.pow(event.translationY, 2)
        );
        
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
  
  const handlePress = () => {
    if (isSelected) {
      console.log("This text is already selected - they probably want to edit it");
      handleEdit();
      return;
    }
    
    const currentPos = {
      x: elementPosition.x,
      y: elementPosition.y
    };
    
    const textToPreserve = currentTextRef.current || element.text;
    
    onSelect();
    
    setTimeout(() => {
      console.log(`Making sure our text stays put at (${currentPos.x}, ${currentPos.y}) and still says "${textToPreserve}"`);
      onUpdate({
        x: currentPos.x,
        y: currentPos.y,
        text: textToPreserve
      });
    }, 50);
  };

  const handleEdit = () => {
    try {
      console.log("Let's edit this text");
      
      currentTextRef.current = element.text;
      setCurrentText(element.text);
      
      const currentPos = {
        x: elementPosition.x,
        y: elementPosition.y
      };
      setElementPosition(currentPos);
      
      setIsEditing(true);
      
      console.log(`Editing text that says "${element.text}" at position (${currentPos.x}, ${currentPos.y})`);
    } catch (error) {
      console.error("Oops! Something went wrong with text editing:", error);
    }
  };

  const handleChangeText = (newText: string) => {
    try {
      console.log("Text changed to:", newText);
      setCurrentText(newText);
      currentTextRef.current = newText;
    } catch (error) {
      console.error("Error when changing text:", error);
    }
  };

  const handleEndEditing = () => {
    try {
      if (!isEditing) {
        console.log("False alarm - we're not even in edit mode");
        return;
      }
      
      console.log("All done editing, saving the new text:", currentText);
      
      const finalText = currentText || "Text";
      currentTextRef.current = finalText;
      
      Keyboard.dismiss();
      
      const currentPos = {
        x: elementPosition.x,
        y: elementPosition.y
      };
      
      setIsEditing(false);
      
      setTimeout(() => {
        console.log(`Saving our edited text "${finalText}" at position (${currentPos.x}, ${currentPos.y})`);
        onUpdate({
          text: finalText,
          x: currentPos.x,
          y: currentPos.y
        });
        
        setElementPosition(currentPos);
        
        onSelect();
      }, 100);
    } catch (error) {
      console.error("Oops! Something went wrong while saving our text:", error);
      setIsEditing(false);
      
      try {
        Keyboard.dismiss();
      } catch (e) {
        console.error("Keyboard is being stubborn:", e);
      }
    }
  };
  
  useEffect(() => {
    fontSize.value = element.fontSize;
    baseFontSize.current = element.fontSize;
    scale.value = element.scale;
  }, [element.fontSize, element.scale]);

  const setIsResizingJS = (resizing: boolean) => {
    setIsResizing(resizing);
  };
  
  const finalizeFontSizeJS = (finalFontSize: number, finalScale: number) => {
    console.log("Text pinch gesture ended");
    setIsResizing(false);
    
    onUpdate({
      fontSize: finalFontSize,
      scale: finalScale
    });
    
    fontSize.value = finalFontSize;
  };
  const pinchGesture = Gesture.Pinch()
    .enabled(isSelected && !isEditing)
    .onStart(() => {
      console.log("Text pinch gesture started");
      runOnJS(setIsResizingJS)(true);
      baseFontSize.current = fontSize.value;
    })
    .onUpdate((e) => {
      if (isSelected && !isEditing) {
        const newFontSize = baseFontSize.current * e.scale;
        fontSize.value = newFontSize;
      }
    })
    .onEnd((e) => {
      if (isSelected && !isEditing) {
        const finalFontSize = Math.max(8, Math.min(72, baseFontSize.current * e.scale));
        const finalScale = element.scale * e.scale;
        
        runOnJS(finalizeFontSizeJS)(finalFontSize, finalScale);
      }
    });

  const rotationValue = useSharedValue(element.rotation);
  const baseRotationValue = useRef(element.rotation);
  
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
    
    onUpdate({
      rotation: finalRotation
    });
  };
  
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
    
  const combinedGestures = Gesture.Simultaneous(
    pinchGesture,
    rotationGesture,
    dragGesture
  );

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      fontSize: fontSize.value,
      fontFamily: element.fontFamily,
      fontWeight: element.fontStyle === 'bold' ? 'bold' : 'normal',
      color: element.color,
    };
  });
  
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