import React, { useState, useRef } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import MathSymbolButton from '../common/MathSymbolButton';

const AddQuestion = ({ onAddQuestion }) => {
  const [questionText, setQuestionText] = useState('');
  const questionTextRef = useRef(null);

  const handleAddQuestion = () => {
    if (questionText.trim() !== '') {
      onAddQuestion(questionText);
      setQuestionText('');
    }
  };

  const mathSymbolsButtonBar = (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <MathSymbolButton onInsertSymbol={(symbol) => {
        const cursorPos = questionTextRef.current.selectionStart;
        const textBefore = questionText.substring(0, cursorPos);
        const textAfter = questionText.substring(cursorPos, questionText.length);
        const newText = textBefore + symbol + textAfter;
        setQuestionText(newText);
        setTimeout(() => {
          questionTextRef.current.focus();
          questionTextRef.current.setSelectionRange(cursorPos + symbol.length, cursorPos + symbol.length);
        }, 50);
      }} />
      <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
        Insert math symbols or equations
      </Typography>
    </Box>
  );

  return (
    <Box>
      {mathSymbolsButtonBar}
      <TextField
        inputRef={questionTextRef}
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
        label="Question"
        fullWidth
        multiline
        rows={4}
        variant="outlined"
        margin="normal"
      />
      <Button variant="contained" color="primary" onClick={handleAddQuestion}>
        Add Question
      </Button>
    </Box>
  );
};

export default AddQuestion;