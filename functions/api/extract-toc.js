/**
 * 边缘函数: AI智能目录提取
 * 路径: /api/extract-toc
 *
 * 功能: 调用千问API分析PDF文本内容，智能识别目录结构
 */

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }

  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { text, apiKey } = await request.json()

    if (!text || !apiKey) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 调用千问API
    const qianwenResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个PDF目录提取专家。请分析用户提供的PDF文本内容，识别出目录结构。返回JSON格式：[{"title": "标题", "page": 页码, "level": 层级(1-3)}]。只返回JSON，不要其他内容。'
            },
            {
              role: 'user',
              content: `请分析以下PDF文本内容，提取目录结构：\n\n${text.slice(0, 5000)}`
            }
          ]
        },
        parameters: {
          result_format: 'message',
          max_tokens: 2000,
          temperature: 0.3
        }
      })
    })

    if (!qianwenResponse.ok) {
      throw new Error(`千问API调用失败: ${qianwenResponse.status}`)
    }

    const qianwenData = await qianwenResponse.json()
    const aiResponse = qianwenData.output?.choices?.[0]?.message?.content || '[]'

    // 解析AI返回的JSON
    let tocItems = []
    try {
      // 提取JSON部分（可能包含在markdown代码块中）
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        tocItems = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('解析AI响应失败:', e)
      tocItems = []
    }

    // 添加唯一ID
    tocItems = tocItems.map(item => ({
      ...item,
      id: crypto.randomUUID()
    }))

    return new Response(JSON.stringify({ tocItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI提取失败:', error)
    return new Response(JSON.stringify({
      error: 'AI提取失败',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
