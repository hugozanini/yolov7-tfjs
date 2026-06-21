import React from "react";
import "../style/loader.css";

const Loader = (props) => {
  return (
    <div className="wrapper" {...props}>
      <div className="shimmer-container">
        <div className="shimmer-bar"></div>
      </div>
      <p>{props.children}</p>
    </div>
  );
};

export default Loader;
