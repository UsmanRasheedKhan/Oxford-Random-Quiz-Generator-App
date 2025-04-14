import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Grid,
  Typography,
  Box,
  Paper,
  IconButton,
  Divider,
  Alert,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MathSymbolButton from '../common/MathSymbolButton';

const QuestionForm = ({ mode, onCancel, onSubmit, error, submitButtonText, initialData }) => {
  // Initialize form with initial data if provided
  const [formData, setFormData] = useState({
    text: initialData?.text || '',
    type: initialData?.type || 'multiple',
    options: initialData?.options || ['', '', '', ''],
    correctOption: initialData?.correctOption || '',
    points: initialData?.points || 1
  });

  // References for text fields
  const questionTextRef = useRef(null);
  const optionRefs = useRef([]);

  // Track the currently focused text field
  const [activeField, setActiveField] = useState(null);

  // Handle tracking focused field
  const handleFieldFocus = (fieldName) => {
    setActiveField(fieldName);
  };

  // Insert math symbol at the current cursor position of the active field
  const handleInsertSymbol = (symbol) => {
    if (!activeField) return;
    
    if (activeField === 'text') {
      // Insert into question text
      const textField = questionTextRef.current;
      if (!textField) return;
      
      const start = textField.selectionStart;
      const end = textField.selectionEnd;
      const currentValue = formData.text;
      
      const newText = currentValue.substring(0, start) + symbol + currentValue.substring(end);
      
      setFormData({
        ...formData,
        text: newText
      });
      
      // Set cursor position after the inserted symbol
      setTimeout(() => {
        textField.focus();
        textField.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 10);
    } 
    // Handle option fields
    else if (activeField.startsWith('option-')) {
      const optionIndex = parseInt(activeField.split('-')[1]);
      if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= formData.options.length) return;
      
      const optionField = optionRefs.current[optionIndex];
      if (!optionField) return;
      
      const start = optionField.selectionStart;
      const end = optionField.selectionEnd;
      const options = [...formData.options];
      const currentValue = options[optionIndex];
      
      options[optionIndex] = currentValue.substring(0, start) + symbol + currentValue.substring(end);
      
      setFormData({
        ...formData,
        options
      });
      
      // Set cursor position after the inserted symbol
      setTimeout(() => {
        optionField.focus();
        optionField.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 10);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('option-')) {
      const index = parseInt(name.split('-')[1]);
      const newOptions = [...formData.options];
      newOptions[index] = value;
      
      setFormData({
        ...formData,
        options: newOptions
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Check if text is in Urdu
  const isUrduText = (text) => {
    const urduRegex = /[\u0600-\u06FF]/;
    return urduRegex.test(text);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          {mode === "edit" ? "Edit Question" : "Add New Question"}
        </Typography>
        {onCancel && (
          <IconButton onClick={onCancel} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Question Text with Math Symbol Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ mr: 1 }}>Question Text</Typography>
              <MathSymbolButton onInsertSymbol={handleInsertSymbol} />
            </Box>
            <TextField
              inputRef={questionTextRef}
              name="text"
              multiline
              rows={4}
              fullWidth
              required
              value={formData.text}
              onChange={handleChange}
              onFocus={() => handleFieldFocus('text')}
              InputProps={{
                style: {
                  direction: isUrduText(formData.text) ? 'rtl' : 'ltr',
                  textAlign: isUrduText(formData.text) ? 'right' : 'left',
                  fontFamily: isUrduText(formData.text) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                }
              }}
            />
          </Grid>

          {/* Question Type Selection */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Question Type</FormLabel>
              <RadioGroup
                row
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <FormControlLabel value="multiple" control={<Radio />} label="Multiple Choice" />
                <FormControlLabel value="short" control={<Radio />} label="Short Answer" />
                <FormControlLabel value="truefalse" control={<Radio />} label="True/False" />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          {/* Multiple Choice Options */}
          {formData.type === 'multiple' && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Options
              </Typography>
              <Grid container spacing={2}>
                {formData.options.map((option, index) => (
                  <Grid item xs={12} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControlLabel
                        value={index.toString()}
                        control={
                          <Radio 
                            checked={formData.correctOption === index.toString()}
                            onChange={() => setFormData({...formData, correctOption: index.toString()})}
                            name="correctOption"
                          />
                        }
                        label=""
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <TextField
                          name={`option-${index}`}
                          inputRef={el => {
                            if (el) optionRefs.current[index] = el;
                          }}
                          value={option}
                          onChange={handleChange}
                          onFocus={() => handleFieldFocus(`option-${index}`)}
                          fullWidth
                          size="small"
                          placeholder={`Option ${index + 1}`}
                          InputProps={{
                            style: {
                              direction: isUrduText(option) ? 'rtl' : 'ltr',
                              textAlign: isUrduText(option) ? 'right' : 'left',
                              fontFamily: isUrduText(option) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                            }
                          }}
                        />
                        {index > 1 && (
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              const newOptions = [...formData.options];
                              newOptions.splice(index, 1);
                              
                              let newCorrectOption = formData.correctOption;
                              if (formData.correctOption === index.toString()) {
                                newCorrectOption = '';
                              } else if (parseInt(formData.correctOption) > index) {
                                newCorrectOption = (parseInt(formData.correctOption) - 1).toString();
                              }
                              
                              setFormData({
                                ...formData,
                                options: newOptions,
                                correctOption: newCorrectOption
                              });
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                ))}
                {formData.options.length < 6 && (
                  <Grid item xs={12}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          options: [...formData.options, '']
                        });
                      }}
                    >
                      Add Option
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}
          
          {/* True/False Options */}
          {formData.type === 'truefalse' && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Select Correct Answer
              </Typography>
              <RadioGroup
                name="correctOption"
                value={formData.correctOption}
                onChange={(e) => setFormData({...formData, correctOption: e.target.value})}
              >
                <FormControlLabel value="true" control={<Radio />} label="True" />
                <FormControlLabel value="false" control={<Radio />} label="False" />
              </RadioGroup>
            </Grid>
          )}
          
          {/* Short Answer */}
          {formData.type === 'short' && (
            <Grid item xs={12}>
              <TextField
                name="correctOption"
                label="Correct Answer"
                fullWidth
                value={formData.correctOption}
                onChange={handleChange}
                InputProps={{
                  style: {
                    direction: isUrduText(formData.correctOption) ? 'rtl' : 'ltr',
                    textAlign: isUrduText(formData.correctOption) ? 'right' : 'left',
                    fontFamily: isUrduText(formData.correctOption) ? 'Noto Nastaliq Urdu, Arial' : 'inherit',
                  }
                }}
              />
            </Grid>
          )}
          
          {/* Points */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              name="points"
              label="Points"
              type="number"
              fullWidth
              value={formData.points}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 1, max: 10 } }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={
              !formData.text.trim() || 
              (formData.type === 'multiple' && !formData.correctOption) ||
              (formData.type === 'truefalse' && !formData.correctOption) ||
              (formData.type === 'short' && !formData.correctOption.trim())
            }
          >
            {submitButtonText || "Submit"}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default QuestionForm;