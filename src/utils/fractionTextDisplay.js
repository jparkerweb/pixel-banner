// export a function that will accept a number with a decimal like .25, .5, .75, 1.25, and return a string like ¼, ½, ¾, 1¼
export function decimalToFractionString(num) {
    const fractionMap = {
      0.25: '¼',
      0.5: '½',
      0.75: '¾',
    };
  
    const whole = Math.floor(num);
    const decimal = +(num - whole).toFixed(2); // Limit to 2 decimal places
  
    let fraction = fractionMap[decimal] || '';
  
    if (whole === 0 && fraction) return fraction;
    if (whole === 0 && !fraction) return num.toString(); // fallback
    return fraction ? `${whole} ${fraction}` : `${whole}`;
  }
  