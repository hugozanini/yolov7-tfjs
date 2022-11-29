import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import Loader from "./components/loader";
import { Webcam } from "./utils/webcam";
import { renderBoxes } from "./utils/renderBox";
//import {non_max_suppression} from "./utils/max_suppression"
import "./style/App.css";


import {
  non_max_suppression,
  yolo_boxes_to_corners,
  yolo_head,
  yolo_filter_boxes,
  YOLO_ANCHORS,
} from './utils/post_process';

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcam = new Webcam();

  // configs
  const modelName = "yolov7";
  const threshold = 0.15;

  /**
   * Function to detect every frame loaded from webcam in video tag.
   * @param {tf.GraphModel} model loaded YOLOv5 tensorflow.js model
   */
  const detectFrame = async (model) => {
    tf.engine().startScope();
    let [modelWidth, modelHeight] = model.inputs[0].shape.slice(1, 3);
    const input = tf.tidy(() => {
      const img = tf.image
                  .resizeBilinear(tf.browser.fromPixels(videoRef.current), [640, 640])
                  .div(255.0)
                  .transpose([2, 0, 1])
                  .expandDims(0);
      return img
    });

    await model.executeAsync(input).then((res) => {

      //TODO: Finish implementation of the non_max_suppression 
      const [boxes_data, scores_data, classes_data] = non_max_suppression (res, canvasRef, threshold);
      renderBoxes(canvasRef, threshold, boxes_data, scores_data, classes_data);

      tf.dispose(res);
    });

    requestAnimationFrame(() => detectFrame(model)); // get another frame
    tf.engine().endScope();
  };

  useEffect(() => {
    tf.loadGraphModel(`${window.location.origin}/${modelName}_web_model/model.json`, {
      onProgress: (fractions) => {
        setLoading({ loading: true, progress: fractions });
      },
    }).then(async (yolov5) => {
      // Warmup the model before using real data.
      const dummyInput = tf.ones(yolov5.inputs[0].shape);
      await yolov5.executeAsync(dummyInput).then((warmupResult) => {
        tf.dispose(warmupResult);
        tf.dispose(dummyInput);

        setLoading({ loading: false, progress: 1 });
        webcam.open(videoRef, () => detectFrame(yolov5));
      });
    });
  }, []);

  return (
    <div className="App">
      <h2>Object Detection Using YOLOv5 & Tensorflow.js</h2>
      {loading.loading ? (
        <Loader>Loading model... {(loading.progress * 100).toFixed(2)}%</Loader>
      ) : (
        <p>Currently running model : YOLOv5{modelName.slice(6)}</p>
      )}

      <div className="content">
        <video autoPlay playsInline muted ref={videoRef} />
        <canvas width={640} height={640} ref={canvasRef} />
      </div>
    </div>
  );
};

export default App;
