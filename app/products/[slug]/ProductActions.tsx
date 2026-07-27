"use client";
import { useState } from "react";
export function ProductActions() {
  const [count, setCount] = useState(1);
  const [added, setAdded] = useState(false);
  return <div className="product-actions"><div className="quantity"><button onClick={() => setCount(Math.max(1, count - 1))}>−</button><span>{count}</span><button onClick={() => setCount(count + 1)}>+</button></div><button className="add-main" onClick={() => setAdded(true)}>{added ? "已加入购物袋" : "加入购物袋"}</button></div>;
}
