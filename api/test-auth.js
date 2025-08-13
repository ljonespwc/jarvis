// Simple test auth endpoint - Vercel serverless function format
export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: "Auth endpoint is working",
    timestamp: Date.now(),
    env_check: {
      hasLayercodeApiKey: !!process.env.LAYERCODE_API_KEY,
      hasPipelineId: !!process.env.LAYERCODE_PIPELINE_ID,
      hasOpenaiKey: !!process.env.OPENAI_API_KEY
    }
  });
}