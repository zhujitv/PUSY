export function LocalizedReelVideo({ player, title }: { player: string; title: string }) {
  return <div className="reel-video">
    <iframe
      src={`https://runtime.strm.yandex.ru/player/video/${player}?autoplay=0&nativeui=true&share=false`}
      title={`${title} 品牌短片`}
      lang="zh-CN"
      loading="lazy"
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>;
}
