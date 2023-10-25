import labels from "./labels.json";

function xywh2xyxy(x){
  //Convert boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
  var y = [];
  y[0] = x[0] - x[2] / 2  //top left x
  y[1] = x[1] - x[3] / 2  //top left y
  y[2] = x[0] + x[2] / 2  //bottom right x
  y[3] = x[1] + x[3] / 2  //bottom right y
  return y;
}

export const renderBoxes = (canvasRef, canvasRef2, threshold, boxes_data, scores_data, classes_data) => {

  const ctx = canvasRef.current.getContext("2d");
  const ctx2 = canvasRef2.current.getContext("2d");

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas
  ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height)

  // font configs
  const font = "18px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  let klassAndCount;
  let predsCount = {};
  for (let i = 0; i < scores_data.length; ++i) {
    //console.log('scores_data[i]: ', scores_data[i])
    if (scores_data[i] > threshold) {
      const klass = labels[classes_data[i]];
      const score = (scores_data[i] * 100).toFixed(1);

      let [x1, y1, x2, y2] = xywh2xyxy(boxes_data[i]);

      const width = x2 - x1;
      const height = y2 - y1;

      // Draw the bounding box.
      ctx.strokeStyle = "#B033FF";
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, width, height);

      // Draw the label background.
      ctx.fillStyle = "#B033FF";
      const textWidth = ctx.measureText(klass + " - " + score + "%").width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x1 - 1, y1 - (textHeight + 2), textWidth + 2, textHeight + 2);

      // Draw labels
      ctx.fillStyle = "#ffffff";
      ctx.fillText(klass + " - " + score + "%", x1 - 1, y1 - (textHeight + 2));

      if (klass in predsCount) {
        predsCount[klass]++;
      } else {
        predsCount[klass] = 1;
      }
    }           
  }
  let y = 50;
  for (const [klass, count] of Object.entries(predsCount)) {   
    ctx2.font = "14px Arial";
    ctx2.fillText(`${klass}: ${count}`, 10, y);  
    y += 10; 
  }  
};
