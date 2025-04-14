import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
  Tooltip,
  Box,
  Typography,
  Menu,
  MenuItem,
  DialogActions,
  Divider,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FunctionsIcon from '@mui/icons-material/Functions';
import { ExpandMore } from '@mui/icons-material';
import FunctionsRoundedIcon from '@mui/icons-material/FunctionsRounded';

const MathSymbolsButton = ({ onInsertSymbol }) => {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [formulaAnchorEl, setFormulaAnchorEl] = useState(null);

  // Common math symbols used in the existing math symbols keyboard
  const mathSymbols = [
    // ... existing math symbols array ...
    { symbol: '+', desc: 'Addition' },
    { symbol: '-', desc: 'Subtraction' },
    { symbol: '×', desc: 'Multiplication' },
    { symbol: '÷', desc: 'Division' },
    { symbol: '=', desc: 'Equals' },
    { symbol: '±', desc: 'Plus-Minus' },
    { symbol: '∞', desc: 'Infinity' },
    { symbol: '≠', desc: 'Not Equal' },
    { symbol: '<', desc: 'Less Than' },
    { symbol: '>', desc: 'Greater Than' },
    { symbol: '≤', desc: 'Less Than or Equal' },
    { symbol: '≥', desc: 'Greater Than or Equal' },
    { symbol: '≈', desc: 'Approximately' },
    { symbol: '∝', desc: 'Proportional to' },
    { symbol: '√', desc: 'Square Root' },
    { symbol: 'π', desc: 'Pi' },
    { symbol: 'θ', desc: 'Theta' },
    { symbol: 'α', desc: 'Alpha' },
    { symbol: 'β', desc: 'Beta' },
    { symbol: 'γ', desc: 'Gamma' },
    { symbol: 'δ', desc: 'Delta' },
    { symbol: 'ε', desc: 'Epsilon' },
    { symbol: 'μ', desc: 'Mu' },
    { symbol: 'σ', desc: 'Sigma' },
    { symbol: 'Σ', desc: 'Sum' },
    { symbol: '∫', desc: 'Integral' },
    { symbol: '∂', desc: 'Partial derivative' },
    { symbol: '∇', desc: 'Del/Nabla' },
    { symbol: '∴', desc: 'Therefore' },
    { symbol: '∵', desc: 'Because' },
    { symbol: '∈', desc: 'Element of' },
    { symbol: '∉', desc: 'Not element of' },
    { symbol: '⊂', desc: 'Subset' },
    { symbol: '⊃', desc: 'Superset' },
    { symbol: '⊆', desc: 'Subset or equal' },
    { symbol: '⊇', desc: 'Superset or equal' }
  ];

  // Initialize the CodeCogs equation editor
  useEffect(() => {
    // Only initialize if the advanced dialog is open
    if (advancedOpen && containerRef.current) {
      setLoading(true);
      
      // Create the necessary elements directly in our container
      const toolbarDiv = document.createElement('div');
      toolbarDiv.id = 'toolbar';
      
      const latexInputDiv = document.createElement('div');
      latexInputDiv.id = 'latexInput';
      
      const outputImg = document.createElement('img');
      outputImg.id = 'output';
      
      // Clear previous content and append the new elements
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(toolbarDiv);
      containerRef.current.appendChild(latexInputDiv);
      containerRef.current.appendChild(outputImg);
      
      // Initialize the editor with a slight delay to ensure DOM is ready
      setTimeout(() => {
        try {
          if (window.EqEditor) {
            const textarea = new window.EqEditor.TextArea('latexInput');
            textarea.addToolbar(new window.EqEditor.Toolbar('toolbar'), true);
            textarea.addOutput(new window.EqEditor.Output('output'));
            
            editorRef.current = textarea;
            setLoading(false);
          } else {
            console.error('CodeCogs equation editor API not available');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error initializing equation editor:', error);
          setLoading(false);
        }
      }, 300);
    }
  }, [advancedOpen]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (option) => {
    handleClose();
    
    if (option === 'basic') {
      setOpen(true);
    } else if (option === 'advanced') {
      setAdvancedOpen(true);
    }
  };

  const handleBasicDialogClose = () => {
    setOpen(false);
  };

  const handleAdvancedDialogClose = () => {
    setAdvancedOpen(false);
    // Clean up editor reference when dialog closes
    editorRef.current = null;
  };

  const handleSymbolClick = (symbol) => {
    if (onInsertSymbol) {
      onInsertSymbol(symbol);
    }
    handleBasicDialogClose();
  };

  const handleInsertAdvancedEquation = () => {
    try {
      if (editorRef.current && onInsertSymbol) {
        // Get the LaTeX from the editor
        const latex = editorRef.current.getEquation();
        if (latex && latex.trim()) {
          // Wrap in \( \) for proper LaTeX rendering
          onInsertSymbol(`\\(${latex}\\)`);
          handleAdvancedDialogClose();
        }
      }
    } catch (error) {
      console.error('Error getting equation from editor:', error);
    }
  };

  const handleFormulaClick = (event) => {
    setFormulaAnchorEl(event.currentTarget);
  };
  
  const handleFormulaMenuClose = () => {
    setFormulaAnchorEl(null);
  };
  
  const handleFormulaSelect = (formula) => {
    handleFormulaMenuClose();
    
    // Common math formulas
    const formulas = {
      'quadratic': 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
      'pythagorean': 'a^2 + b^2 = c^2',
      'area-circle': 'A = \\pi r^2',
      'volume-sphere': 'V = \\frac{4}{3}\\pi r^3',
      'newton-second': 'F = m \\cdot a',
      'einstein': 'E = mc^2'
    };
    
    if (formulas[formula]) {
      onInsertSymbol(formulas[formula]);
    }
  };

  return (
    <>
      {/* Math Symbol Button that opens dropdown */}
      <Tooltip title="Math Symbols">
        <Button 
          variant="outlined" 
          size="small" 
          onClick={handleClick}
          sx={{ minWidth: 40, height: 40, px: 1 }}
        >
          <FunctionsIcon />
        </Button>
      </Tooltip>
      
      {/* New Green Math Formula Button */}
      <Tooltip title="Math Formulas">
        <Button 
          variant="outlined" 
          size="small" 
          onClick={handleFormulaClick}
          sx={{ 
            minWidth: 40, 
            height: 40, 
            px: 1, 
            ml: 1, 
            color: 'green',
            borderColor: 'green',
            '&:hover': {
              borderColor: 'darkgreen',
              backgroundColor: 'rgba(0, 128, 0, 0.04)'
            }
          }}
        >
          <FunctionsRoundedIcon style={{ color: 'green' }} />
        </Button>
      </Tooltip>
      
      {/* Dropdown menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => handleMenuItemClick('basic')}>Basic Symbols</MenuItem>
        <MenuItem onClick={() => handleMenuItemClick('advanced')}>Advanced Editor</MenuItem>
      </Menu>
      
      {/* Dropdown menu for formula button */}
      <Menu
        anchorEl={formulaAnchorEl}
        open={Boolean(formulaAnchorEl)}
        onClose={handleFormulaMenuClose}
      >
        <MenuItem onClick={() => handleFormulaSelect('quadratic')}>Quadratic Formula</MenuItem>
        <MenuItem onClick={() => handleFormulaSelect('pythagorean')}>Pythagorean Theorem</MenuItem>
        <MenuItem onClick={() => handleFormulaSelect('area-circle')}>Area of Circle</MenuItem>
        <MenuItem onClick={() => handleFormulaSelect('volume-sphere')}>Volume of Sphere</MenuItem>
        <MenuItem onClick={() => handleFormulaSelect('newton-second')}>Newton's Second Law</MenuItem>
        <MenuItem onClick={() => handleFormulaSelect('einstein')}>Einstein's Equation</MenuItem>
      </Menu>
      
      {/* Basic Math Symbols Dialog (Existing UI) */}
      <Dialog 
        open={open} 
        onClose={handleBasicDialogClose}
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Math Symbols</Typography>
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={handleBasicDialogClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1}>
            {mathSymbols.map((item, index) => (
              <Grid item key={index}>
                <Tooltip title={item.desc}>
                  <Button
                    variant="outlined"
                    onClick={() => handleSymbolClick(item.symbol)}
                    sx={{ minWidth: 40, height: 40 }}
                  >
                    {item.symbol}
                  </Button>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
      
      {/* Advanced Math Editor Dialog */}
      <Dialog
        open={advancedOpen}
        onClose={handleAdvancedDialogClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Advanced Math Equation Editor</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleAdvancedDialogClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary" paragraph>
              Use the toolbar to create complex mathematical equations.
            </Typography>
            
            <Box 
              sx={{ 
                border: '1px solid #e0e0e0', 
                p: 2, 
                borderRadius: 1, 
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }} 
              ref={containerRef}
            >
              {loading && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255,255,255,0.7)'
                }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Loading editor...
                  </Typography>
                </Box>
              )}
              {/* CodeCogs editor elements will be created here dynamically */}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            {/* <Typography variant="caption" color="textSecondary">
              Powered by CodeCogs Equation Editor
            </Typography> */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAdvancedDialogClose}>Cancel</Button>
          <Button 
            onClick={handleInsertAdvancedEquation}
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            Insert Equation
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MathSymbolsButton;