import labels from "./labels.json";

/**
 * Render prediction boxes
 * @param {HTMLCanvasElement} canvasRef canvas tag reference
 * @param {number} threshold threshold number
 * @param {Array} boxes_data boxes array
 * @param {Array} scores_data scores array
 * @param {Array} classes_data class array
 */


function xyxy2xywh(x){
  //Convert nx4 boxes from [x1, y1, x2, y2] to [x, y, w, h] where xy1=top-left, xy2=bottom-right
  var y = [];
  y[0] = (x[0] + x[2])/2; //x center
  y[1] = (x[1] + x[3])/2; //y center
  y[2] = (x[2] - x[0]); //width
  y[3] = (x[3] - x[1]); //height
  return y;
}

function xywh2xyxy(x){
  //Convert nx4 boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
  var y = [];
  y[0] = x[0] - x[2] / 2  //top left x
  y[1] = x[1] - x[3] / 2  //top left y
  y[2] = x[0] + x[2] / 2  //bottom right x
  y[3] = x[1] + x[3] / 2  //bottom right y
  return y;
}

function scale_coords(ctx, bboxes){
  //ref: https://github.com/WongKinYiu/yolov7/blob/8c0bf3f78947a2e81a1d552903b4934777acfa5f/utils/general.py#L320
  // const gain = Math.min(ctx.canvas.width/ctx.canvas.offsetWidth, ctx.canvas.height/ctx.canvas.offsetHeight); //gain  = old / new
  // const pad = [(ctx.canvas.width - ctx.canvas.offsetWidth*gain)/2, (ctx.canvas.height - ctx.canvas.offsetHeight*gain)/2]; //wh padding
  const gain = Math.min(ctx.canvas.width/640, ctx.canvas.height/ctx.canvas.offsetHeight); //gain  = old / new
  const pad = [(ctx.canvas.width - 640*gain)/2, (ctx.canvas.height - 640*gain)/2]; //wh padding
  let [x1, y1, x2, y2] = bboxes;

  x1 = (x1 - pad[0])/gain;
  x2 = (x2 - pad[0])/gain;
  y1 = (y1 - pad[1])/gain;
  y2 = (y2 - pad[1])/gain;


  return [x1, y1, x2, y2];
}
export const renderBoxes = (canvasRef, threshold, boxes_data, scores_data, classes_data, ratios) => {
  // console.log('in_classes_data: ', classes_data);
  // console.log('in_scores data: ', scores_data);
  // console.log('threshold: ', threshold);
  // console.log('in_boxes data: ', boxes_data);

  const ctx = canvasRef.current.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  // font configs
  const font = "18px sans-serif";
  ctx.font = font;
  ctx.textBaseline = "top";

  for (let i = 0; i < scores_data.length; ++i) {
    //console.log('scores_data[i]: ', scores_data[i])
    if (scores_data[i] > threshold) {
      const klass = labels[classes_data[i]];
      //console.log('klass: ', klass);
      const score = (scores_data[i] * 100).toFixed(1);

      // -- Copying python
      var bboxes = xyxy2xywh(boxes_data[i]);
      // Rectangle to square
      const max_dim = Math.max(bboxes[2], bboxes[3]);
      //pad
      //bboxes[2] = bboxes[3] = max_dim * 1.3 + 30;
      bboxes = xywh2xyxy(bboxes);

      //https://github.com/WongKinYiu/yolov7/blob/8c0bf3f78947a2e81a1d552903b4934777acfa5f/utils/general.py#L855

      //console.log ("------");
      //Rescale boxes from img_size to im0 size
      let [x1, y1, x2, y2] = boxes_data[i];//scale_coords(ctx, bboxes);
      // console.log("x1: ", x1);
      // console.log("y1: ", y1);
      // console.log("x2: ", x2);
      // console.log("y2: ", y2);
      // console.log("---------------");

      // console.log("canvasRef.width: ", ctx.canvas.offsetWidth);
      // console.log("ctx.canvas.height: ", ctx.canvas.offsetHeight);
      //console.log("canvasRef.height: ", canvasRef.);

      // x1 *= ctx.canvas.offsetWidth/640; //ratios[0]; //canvasRef.width * ratios[0];
      // x2 *= ctx.canvas.offsetWidth/640; //ratios[0]; //canvasRef.width * ratios[0];
      // y1 *= ctx.canvas.offsetHeight/640; //ratios[1]; //canvasRef.height * ratios[1];
      // y2 *= ctx.canvas.offsetHeight/640; //ratios[1]; //canvasRef.height * ratios[1];
      const width = x2 - x1;
      const height = y2 - y1;


      const xGain = 640; //canvasRef.current.width;
      const yGain = 640; //canvasRef.current.height;
      

      // Draw the bounding box.
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 2;

      //ctx.strokeRect(x1, y1, width, height);
      ctx.strokeRect(x1, y1, width, height);
      //ctx.strokeRect((x1+x2)/2, (y1 + y2)/2, x2-x1, y2-y1);

      // Draw the label background.
      ctx.fillStyle = "#00FF00";
      const textWidth = ctx.measureText(klass + " - " + score + "%").width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x1 - 1, y1 - (textHeight + 2), textWidth + 2, textHeight + 2);

      // Draw labels
      ctx.fillStyle = "#ffffff";
      ctx.fillText(klass + " - " + score + "%", x1 - 1, y1 - (textHeight + 2));
    }
  }
};
