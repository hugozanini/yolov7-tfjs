import { keep } from "@tensorflow/tfjs-core";

export function non_max_suppression(prediction, canvasRef, conf_threshold){
    //console.log('prediction-antes: ', prediction);
    console.log('prediction shape: ', prediction.shape)
    prediction = prediction.arraySync()[0];
    console.log('prediction: ', prediction);
    //console.log('prediction shape: ', prediction.shape)

    const nc = 80  // number of classes


    // //console.log('prediction-depois: ', prediction[0]);
    const size = 2142000; //1x25200x85=2142000
    const dimensions = 85;
    const rows = size/dimensions; //25200

    //const conf_threshold = 0.25;
    const iou_thres = 0.03; //Confirm it
    const confidenceIndex = 5; //4;
    const labelStartIndex = 6; //5
    const modelWidth = 640.0;
    const modelHeight = 640.0;
    const xGain = modelWidth / canvasRef.current.width;
    const yGain = modelHeight / canvasRef.current.height;

    var detectionObjects = new Array();
    var location = new Array();
    var boxes_data = new Array();
    var scores_data = new Array();
    var classes_data = new Array();
    // var labels = new Array();
    // var confidences = new Array();

    // var src_rects = new Array();
    // var res_rects = new Array();

    // var res_indexs = new Array();

    // var rect = new Array();
    // var location = new Array();

    // // const index = 0;
    // console.log('test: ', prediction[0]);
    // console.log('CONF: ', prediction[0][confidenceIndex]);


    for (let i = 0; i < dimensions; ++i) {
        const index = i * dimensions;
        //cDetection Confidence
        if (prediction[i][confidenceIndex] <= conf_threshold){ //TODO: Confirm this zeros
            //console.log('menor <: ', prediction[i][confidenceIndex]); //eliminate the low thresholds
            continue;

        }
        // else{
        //     console.log('MAIOR >: ', prediction[i][confidenceIndex]);
        // }

        //Detect Confidence * Class Confidence
        // for(let j = labelStartIndex; j < dimensions; ++j){
        //     prediction[i][j] = prediction[i][j] * prediction[i][confidenceIndex];
        // }

        //console.log('post_processed: ', prediction[i]);
        //console.log('prediction[i][k]: ', prediction[i][labelStartIndex]);
        for (let k = labelStartIndex; k < dimensions; ++k){
            // if (prediction[i][k] <= iou_thres){ //TODO: Confirm this value
            //     continue;
            // }

            if (prediction[i][k]*prediction[i][confidenceIndex] <= iou_thres){ //TODO: Confirm this value
                continue;
            }

            // console.log('IoU: ', prediction[i][k]*prediction[i][confidenceIndex]);
            // console.log('Confidence: ', prediction[i][k]);
            // const detected_class = k;
            // const iou = prediction[i][k]*prediction[i][confidenceIndex]
            // console.log('Detected Class: ', detected_class);
            // console.log('iou: ', iou);
            // console.log('i: ', i);



            // location[0] = ((prediction[i][0] - prediction[i][2]) /2)/xGain; //top left x
            // location[1] = ((prediction[i][1] - prediction[i][3]) / 2) / yGain;//top left y
            // //location[1] = (prediction[i][3] - prediction[i][1] / 2);// / yGain;//top left y
            // location[2] = ((prediction[i][0] + prediction[i][2]) / 2)/ xGain;//bottom right x
            // location[3] = ((prediction[i][1] + prediction[i][3]) / 2)/ yGain;//bottom right y


            //Convert nx4 boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
            // location[0] = prediction[i][0] - prediction[i][2]/2; //x1
            // location[1] = prediction[i][1] - prediction[i][3]/2; //y1
            // location[2] = prediction[i][0] + prediction[i][2]/2; //x2
            // location[3] = prediction[i][1] + prediction[i][3]/2; //y2



            location[0] = prediction[i][0]; //x1
            location[1] = prediction[i][1]; //y1
            location[2] = prediction[i][2];  //x2
            location[3] = prediction[i][3];  //y2
            //console.log('predictions: ', prediction[i]);

            boxes_data.push([location]);
            scores_data.push([prediction[i][k]]);
            classes_data.push([k]);

        }

    }
    //console.log('location: ', location);
    //console.log('classes_data: ', classes_data);
    // console.log('scores data: ', scores_data);
    // console.log('boxes data: ', boxes_data);

    //console.log('size: ', preds);
    return [boxes_data, scores_data, classes_data]
}




//https://github.com/ultralytics/yolov5/issues/708