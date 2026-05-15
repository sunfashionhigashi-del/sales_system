import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const readJsonBody = async (req: import('node:http').IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks).toString('utf8')
  return body ? JSON.parse(body) : {}
}

const sendJson = (res: import('node:http').ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

const runPythonScript = async (scriptPath: string, args: string[] = []) => {
  const candidates = [
    process.env.PYTHON,
    'C:\\Users\\higashi\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe',
    'python',
  ].filter(Boolean) as string[]

  let lastError: unknown = null
  for (const python of candidates) {
    try {
      return await execFileAsync(python, [scriptPath, ...args], {
        cwd: process.cwd(),
        timeout: 120000,
        windowsHide: true,
      })
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

const exchangeImportPlugin = () => ({
  name: 'success-exchange-import-api',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use('/api/import-mufg-daily-usd', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'import_mufg_daily_usd_rate.py')
        const { stdout, stderr } = await runPythonScript(scriptPath)
        sendJson(res, 200, { ok: true, stdout, stderr })
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    })

    server.middlewares.use('/api/import-murc-usd', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' })
        return
      }
      try {
        const body = await readJsonBody(req)
        const xlsPath = String(body.xlsPath || '').trim()
        if (!xlsPath || !existsSync(xlsPath)) {
          sendJson(res, 400, { ok: false, error: 'MURC Excel file path not found.' })
          return
        }
        const scriptPath = path.join(process.cwd(), 'scripts', 'import_murc_usd_rates.py')
        const { stdout, stderr } = await runPythonScript(scriptPath, [xlsPath])
        sendJson(res, 200, { ok: true, stdout, stderr })
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), exchangeImportPlugin()],
})
