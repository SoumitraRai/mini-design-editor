import { useState } from 'react';
import { CanvasElementType, TextElement, ImageElement, ShapeElement } from '../types';

export default function useCanvasElements() {
  const [elements, setElements] = useState<CanvasElementType[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const addElement = (element: CanvasElementType) => {
    try {
      setElements([...elements, element]);
      setSelectedElementId(element.id);
    } catch (error) {
      console.error("Error adding element:", error);
    }
  };

  // Use a more type-safe approach for updating elements
  const updateElement = (id: string, updates: Partial<CanvasElementType>) => {
    try {
      if (!id) {
        console.warn("Cannot update element: No ID provided");
        return;
      }
      
      const elementToUpdate = elements.find(el => el.id === id);
      if (!elementToUpdate) {
        console.warn(`Cannot update element: Element with ID ${id} not found`);
        return;
      }
      
      console.log(`Updating element ${id} of type ${elementToUpdate.type} with:`, updates);
      
      // Ensure we have valid position values
      const hasValidPosition = (
        (updates.x !== undefined && !isNaN(updates.x)) || 
        (updates.y !== undefined && !isNaN(updates.y))
      );
      
      // Only update position if valid values are provided
      const positionUpdates = hasValidPosition ? {
        x: updates.x !== undefined ? updates.x : elementToUpdate.x,
        y: updates.y !== undefined ? updates.y : elementToUpdate.y,
      } : {};
      
      setElements(
        elements.map(element => {
          if (element.id !== id) {
            return element;
          }
          
          // Type-guard to ensure we maintain correct element types
          switch (element.type) {
            case 'text':
              // Cast to TextElement for proper type checking
              const textElement = element as TextElement;
              const textUpdates = updates as Partial<TextElement>;
              
              // Check if we're trying to update only position without specifying text
              // In that case, make sure we preserve existing text
              const shouldPreserveText = (
                textUpdates.text === undefined && 
                updates.x !== undefined &&
                updates.y !== undefined
              );
              
              const textToUse = shouldPreserveText ? textElement.text : 
                (textUpdates.text !== undefined ? textUpdates.text : textElement.text);
              
              const updatedTextElement = {
                ...textElement,
                ...positionUpdates, // Apply position updates first
                ...textUpdates,
                type: 'text' as const,  // Ensure the type stays correct
                // Prioritize position values from updates, fall back to current values
                x: updates.x !== undefined ? updates.x : textElement.x,
                y: updates.y !== undefined ? updates.y : textElement.y,
                // Ensure we don't lose the text during position updates
                text: textToUse
              };
              console.log(`Updated text element: x=${updatedTextElement.x}, y=${updatedTextElement.y}, text="${updatedTextElement.text}"`);
              return updatedTextElement;
              
            case 'image':
              const updatedImageElement = {
                ...element,
                ...positionUpdates, // Apply position updates first
                ...(updates as Partial<ImageElement>),
                type: 'image' as const,  // Ensure the type stays correct
                // Prioritize position values from updates, fall back to current values
                x: updates.x !== undefined ? updates.x : element.x,
                y: updates.y !== undefined ? updates.y : element.y,
              };
              console.log(`Updated image element: x=${updatedImageElement.x}, y=${updatedImageElement.y}`);
              return updatedImageElement;
              
            case 'shape':
              return {
                ...element,
                ...positionUpdates, // Apply position updates first
                ...(updates as Partial<ShapeElement>),
                type: 'shape' as const,  // Ensure the type stays correct
                // Prioritize position values from updates, fall back to current values
                x: updates.x !== undefined ? updates.x : element.x,
                y: updates.y !== undefined ? updates.y : element.y,
              };
              
            default:
              return element;
          }
        })
      );
    } catch (error) {
      console.error("Error updating element:", error);
    }
  };

  const removeElement = (id: string) => {
    try {
      setElements(elements.filter(element => element.id !== id));
      if (selectedElementId === id) {
        setSelectedElementId(null);
      }
    } catch (error) {
      console.error("Error removing element:", error);
    }
  };

  const selectedElement = elements.find(el => el.id === selectedElementId) || null;

  return {
    elements,
    selectedElement,
    selectedElementId,
    setSelectedElementId,
    addElement,
    updateElement,
    removeElement,
  };
}