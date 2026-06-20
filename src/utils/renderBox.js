import labels from "./labels.json";

/**
 * Helper to convert HEX to RGBA.
 */
const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Render bounding boxes on canvas.
 * @param {React.MutableRefObject} canvasRef Canvas reference
 * @param {Float32Array} boxes Flat array of [x1, y1, x2, y2]
 * @param {Float32Array} scores Array of scores
 * @param {Int32Array} classes Array of class indices
 */
export const renderBoxes = (canvasRef, boxes, scores, classes) => {
  if (!canvasRef.current) return;
  const ctx = canvasRef.current.getContext("2d");
  if (!ctx) return;

  // Clean canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Font styling
  const fontSize = 14;
  ctx.font = `600 ${fontSize}px Google Sans, Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = "top";

  // Softer palette of pastel-like M3 system tones for standard classes
  const colors = [
    "#F2B8B5", // Soft Red
    "#F8C0AD", // Soft Orange
    "#FFE88A", // Soft Yellow
    "#C4EED0", // Soft Green
    "#A4ECE4", // Soft Teal
    "#A4E2FC", // Soft Cyan
    "#A8C7FA", // Soft Blue
    "#C5A3E8", // Soft Indigo
    "#D3B6F0", // Soft Purple
    "#F5B0C2", // Soft Pink
  ];

  for (let i = 0; i < scores.length; i++) {
    const classIdx = classes[i];
    const scoreVal = scores[i];
    
    const klass = labels[classIdx] || `class ${classIdx}`;
    const scoreText = (scoreVal * 100).toFixed(1);

    // Extracted directly from flat Float32Array
    const x1 = boxes[i * 4];
    const y1 = boxes[i * 4 + 1];
    const x2 = boxes[i * 4 + 2];
    const y2 = boxes[i * 4 + 3];

    const width = x2 - x1;
    const height = y2 - y1;

    // Pick color based on class index
    const color = colors[classIdx % colors.length];

    // 1. Draw thin 2px bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.strokeRect(x1, y1, width, height);

    // 2. Draw 10% opacity fill inside the box
    ctx.fillStyle = hexToRgba(color, 0.1);
    ctx.fillRect(x1, y1, width, height);

    // 3. Draw rounded label pill with 80% opacity fill
    const labelText = `${klass} - ${scoreText}%`;
    const textWidth = ctx.measureText(labelText).width;
    const labelHeight = fontSize + 6;

    // Decide if label goes above or inside the box
    let labelY = y1 - labelHeight;
    if (labelY < 0) {
      labelY = y1 + 3; // Inside the box if it hits the top border
    }

    // Label background pill
    ctx.fillStyle = hexToRgba(color, 0.8);
    ctx.beginPath();
    ctx.roundRect(x1 - 1, labelY, textWidth + 10, labelHeight, 4);
    ctx.fill();

    // Label text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(labelText, x1 + 4, labelY + 3);
  }
};
