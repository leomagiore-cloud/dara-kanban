import React from "react";
import { Sparkles } from "lucide-react";

export default function Placeholder({ title, desc, tag = "em construção" }) {
  return (
    <div className="placeholder">
      <div className="placeholder-icon">
        <Sparkles size={26} />
      </div>
      <div className="placeholder-title">{title}</div>
      <div className="placeholder-desc">{desc}</div>
      {tag && <span className="placeholder-tag">{tag}</span>}
    </div>
  );
}