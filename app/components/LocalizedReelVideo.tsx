"use client";

import Image from "next/image";
import { useState } from "react";

export function LocalizedReelVideo({ player, title, poster }: { player: string; title: string; poster: string }) {
  const [playing, setPlaying] = useState(false);

  return <div className="reel-video">
    {playing ? <>
      <iframe
        src={`https://runtime.strm.yandex.ru/player/video/${player}?nativeui=true&share=false`}
        title={`${title} 品牌短片`}
        lang="zh-CN"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      <button className="reel-video-close" type="button" onClick={() => setPlaying(false)} aria-label={`关闭${title}短片`}>关闭</button>
    </> : <button className="reel-video-trigger" type="button" onClick={() => setPlaying(true)} aria-label={`播放${title}短片`}>
      <Image src={poster} alt="" fill sizes="300px" />
      <span aria-hidden="true">▶</span>
      <strong>播放短片</strong>
      <small>点击后加载视频</small>
    </button>}
  </div>;
}
