import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import MathSymbolsButton from './MathSymbolsButton';

const QuestionTextEditor = ({ 
  // ...existing code...
}) => {
  // ...existing code...
  
  const [showMathSymbols, setShowMathSymbols] = useState(false);

  const handleInsertSymbol = (symbol) => {
    // Logic to insert the symbol into the text editor
    const editor = editorRef.current;
    if (editor) {
      editor.focus();
      const selection = editor.getSelection();
      editor.replaceSelection(symbol);
      // Position cursor after the inserted symbol
      editor.setCursor({
        line: selection.head.line,
        ch: selection.head.ch + symbol.length
      });
    }
  };
  
  const toggleMathSymbols = () => {
    setShowMathSymbols(!showMathSymbols);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* ...existing code... */}

      <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
        {/* ...existing code... */}
        
        {/* Formula button */}
        <Button
          variant="outlined"
          size="small"
          color="primary"
          onClick={toggleMathSymbols}
          sx={{ textTransform: 'none' }}
        >
          Formulas
        </Button>
        
        {showMathSymbols && <MathSymbolsButton onInsertSymbol={handleInsertSymbol} />}
      </Box>
      
      {/* ...existing code... */}
    </Box>
  );
};

export default QuestionTextEditor;