import labels from "./labels.json";

/**
 * Render prediction boxes
 * @param {React.MutableRefObject} canvasRef canvas tag reference
 * @param {number} threshold threshold number
 * @param {Array} boxes_data boxes array
 * @param {Array} scores_data scores array
 * @param {Array} classes_data class array
 */
export const renderBoxes = (canvasRef, threshold, boxes_data, scores_data, classes_data) => {
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
      // console.log('entrei');
      // console.log('in_scores data: ', scores_data);
      const klass = labels[classes_data[i]];
      console.log('klass: ', klass);
      const score = (scores_data[i] * 100).toFixed(1);

      // let [x1, y1, x2, y2] = boxes_data[i].slice(); //boxes_data.slice(i * 4, (i + 1) * 4);
      // console.log('boxes_data[i][0]: ', boxes_data[i][0]);
      // console.log('boxes_data[i]', boxes_data[i])
      // var x1 = boxes_data[i][0][0]; //width
      // var y1 = boxes_data[i][0][1]; //height
      // var x2 = boxes_data[i][0][2]; //x center
      // var y2 = boxes_data[i][0][3]; //y center


      var y2 = boxes_data[i][0][0]; //width
      var x1 = boxes_data[i][0][1]; //height
      var x2 = boxes_data[i][0][2]; //x center
      var y1 = boxes_data[i][0][3]; //y center


      const xGain = 640; //canvasRef.current.width;
      const yGain = 640; //canvasRef.current.height;
      
      console.log('x1: ', x1);
      console.log('y1: ', y1);
      console.log('x2: ', x2);
      console.log('y2: ', y2);

      console.log('-----');
      // x1 *= xGain;
      // x2 *= xGain;
      // y1 *= yGain;
      // y2 *= yGain;
      const width = x2 - x1;
      const height = y2 - y1;

      console.log('x1: ', x1);
      console.log('y1: ', y1);
      console.log('x2: ', x2);
      console.log('y2: ', y2);
      console.log('width: ', width);
      console.log('height: ', height);

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
