import labels from "./labels.json";

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
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = "top";

  // Modern vibrant color palette (system colors)
  const colors = [
    "#FF3B30", // Red
    "#FF9500", // Orange
    "#FFCC00", // Yellow
    "#34C759", // Green
    "#00C7BE", // Teal
    "#30B0C7", // Cyan
    "#32ADE6", // Light Blue
    "#007AFF", // Blue
    "#5856D6", // Purple
    "#AF52DE", // Indigo
    "#FF2D55", // Pink
    "#A2845E", // Brown
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

    // 1. Draw bounding box with border shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeRect(x1, y1, width, height);

    // Reset shadow for label rendering
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 2. Draw label pill
    const labelText = `${klass} - ${scoreText}%`;
    const textWidth = ctx.measureText(labelText).width;
    const labelHeight = fontSize + 6;

    // Decide if label goes above or inside the box
    let labelY = y1 - labelHeight;
    if (labelY < 0) {
      labelY = y1 + 3; // Inside the box if it hits the top border
    }

    // Label background pill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x1 - 1.5, labelY, textWidth + 10, labelHeight, 4);
    ctx.fill();

    // Label text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(labelText, x1 + 3, labelY + 3);
  }
};
