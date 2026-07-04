/* 胜利彩带:生成随机像素方块参数,配合 app.wxss 的 .confetti/.cf 使用 */
module.exports = function (n) {
  const colors = ['#d97757', '#d4af37', '#5ad17a', '#5fa6e0', '#e9e2cf', '#d98fd0'];
  const list = [];
  const num = n || 36;
  for (let i = 0; i < num; i++) {
    list.push({
      l: +(Math.random() * 100).toFixed(1),
      d: +(Math.random() * 0.8).toFixed(2),
      t: +(1.6 + Math.random() * 1.4).toFixed(2),
      s: 8 + Math.floor(Math.random() * 10),
      c: colors[i % colors.length]
    });
  }
  return list;
};
