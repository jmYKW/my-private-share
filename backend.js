// backend.js - Cloudflare Worker 代码

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理跨域 (CORS)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 获取数据
    if (request.method === "GET") {
      const { results } = await env.MYDB.prepare("SELECT * FROM items ORDER BY created_at DESC").all();
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 上传数据
    if (request.method === "POST") {
      const formData = await request.formData();
      const text = formData.get('text');
      const image = formData.get('image');

      let imageUrl = null;

      // 如果有图片，上传到 R2
      if (image && image.size > 0) {
        const filename = `${Date.now()}-${image.name}`;
        await env.MYBUCKET.put(filename, image);
        // 这里简单返回一个直链，实际生产建议用 signed url
        imageUrl = `https://pub-你的-r2-public-url/${filename}`; 
        // 注意：你需要在R2设置里开启“公共访问”或者用下面的逻辑生成链接
      }

      await env.MYDB.prepare(
        "INSERT INTO items (text, image_url, created_at) VALUES (?, ?, ?)"
      ).bind(text, imageUrl, new Date().toISOString()).run();

      return new Response("OK", { headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404 });
  },
};
