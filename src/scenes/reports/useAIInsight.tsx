import { useState, useCallback } from 'react'
import axios from 'axios'

function useAiInsights () {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Call this only when the user clicks Generate
  const generateInsights = useCallback(
    async ({ platforms, companyName, period }) => {
      setLoading(true)
      setInsights(null)
      setError(null)
      try {
        const res = await axios.post(
          'https://yoursdvniel-Quant-Social-Media.hf.space/api/ai-insight',
          {
            platforms,
            companyName,
            period
          }
        )
        // Log the raw response:
        console.log('AI raw response:', res.data)

        let parsed = res.data.insights
        // Also log what you’re about to parse:
        console.log('AI insights field:', parsed)

        if (typeof parsed === 'string') {
          // Remove markdown code block if present
          parsed = parsed.trim()
          if (parsed.startsWith('```json')) {
            parsed = parsed
              .replace(/^```json/, '')
              .replace(/```$/, '')
              .trim()
          } else if (parsed.startsWith('```')) {
            parsed = parsed.replace(/^```/, '').replace(/```$/, '').trim()
          }
          try {
            parsed = JSON.parse(parsed)
          } catch {
            setError('AI did not return valid data.')
            setLoading(false)
            return
          }
        }

        setInsights(parsed)
      } catch (e) {
        setError('Could not fetch insights.')
      }

      setLoading(false)
    },
    []
  )

  return { insights, loading, error, generateInsights }
}

export default useAiInsights
