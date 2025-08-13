// Simple test auth endpoint
export default async function handler(req) {
  return Response.json({
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