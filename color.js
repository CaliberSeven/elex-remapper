var darkBlue = {r: 0, g: 0, b: 230}
var lightBlue = {r: 200, g: 200, b: 255}
var lightRed = {r: 255, g: 200, b: 200}
var darkRed = {r: 230, g: 0, b: 0}

export function getColor(margin) {
    let color;
    if (margin < -0.5)
        color = darkRed;
    else if (margin < 0)
        color = mix(darkRed, lightRed, -0.5, 0, margin)
    else if (margin == 0)
        color = {r: 222, g:201, b:228};
    else if (margin < 0.5)
        color = mix(lightBlue, darkBlue, 0, 0.5, margin)
    else 
        color = darkBlue;
    return colorString(color)
}

function mix(c1, c2, start, end, i){
    let a = (i - start) / (end - start);
    let b = 1 - a;
  
    return {
        r: (c1.r * b + c2.r * a), 
        g: (c1.g * b + c2.g * a),
        b: (c1.b * b + c2.b * a)}
  }
  
  function colorString(color){
    return `rgb(${color.r},${color.g},${color.b})`;
  }