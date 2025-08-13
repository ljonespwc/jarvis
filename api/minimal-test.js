export default async function handler(req, res) {
  return res.status(200).json({ 
    message: 'Hello from minimal test',
    method: req.method,
    hasBody: !!req.body
  });
}