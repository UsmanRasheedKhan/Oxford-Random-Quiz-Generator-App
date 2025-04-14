import React from 'react';
import MathSymbolsButton from '../teacher/MathSymbolsButton';

/**
 * A wrapper component for MathSymbolsButton to be used in forms
 * @param {function} onInsertSymbol - Function to handle insertion of symbols into text fields
 */
const MathSymbolButton = ({ onInsertSymbol }) => {
  return <MathSymbolsButton onInsertSymbol={onInsertSymbol} />;
};

export default MathSymbolButton;