import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell
} from 'docx'
import { saveAs } from 'file-saver'



export function exportReportToWord (modalReport: ModalReport) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: `${modalReport.companyName} — Social Media Report`,
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({
            text: modalReport.period,
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({ text: modalReport.overview }),
          new Paragraph({
            text: 'Platform Metrics View Observations',
            heading: HeadingLevel.HEADING_2
          }),
          ...modalReport.consolidatedChartObservations.map(
            o => new Paragraph({ text: `- ${o}` })
          ),
          // Insert platform chart images if you convert your Highcharts to image and add them (see below)
          ...modalReport.platforms
            .map(platform => [
              new Paragraph({
                text: platform.name,
                heading: HeadingLevel.HEADING_2
              }),
              ...(platform.name === 'Google'
                ? [
                    new Paragraph({
                      text: 'Google Funnel Observations',
                      heading: HeadingLevel.HEADING_3
                    }),
                    ...modalReport.googleFunnelObservations.map(
                      o => new Paragraph({ text: `- ${o}` })
                    )
                  ]
                : []),
              new Paragraph({
                text: 'Key Observations',
                heading: HeadingLevel.HEADING_3
              }),
              ...platform.observations.map(
                o => new Paragraph({ text: `- ${o}` })
              ),
              new Paragraph({
                text: 'Metrics',
                heading: HeadingLevel.HEADING_3
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph('Metric')] }),
                      new TableCell({ children: [new Paragraph('Value')] })
                    ]
                  }),
                  ...platform.metrics.map(
                    m =>
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph(String(m.label))]
                          }),
                          new TableCell({
                            children: [new Paragraph(String(m.value))]
                          })
                        ]
                      })
                  )
                ]
              })
            ])
            .flat(),
          // SWOT
          new Paragraph({
            text: 'SWOT Analysis',
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({ text: 'Strengths', heading: HeadingLevel.HEADING_3 }),
          ...modalReport.swot.strengths.map(
            s => new Paragraph({ text: `- ${s}` })
          ),
          new Paragraph({
            text: 'Weaknesses',
            heading: HeadingLevel.HEADING_3
          }),
          ...modalReport.swot.weaknesses.map(
            s => new Paragraph({ text: `- ${s}` })
          ),
          new Paragraph({
            text: 'Opportunities',
            heading: HeadingLevel.HEADING_3
          }),
          ...modalReport.swot.opportunities.map(
            s => new Paragraph({ text: `- ${s}` })
          ),
          new Paragraph({ text: 'Threats', heading: HeadingLevel.HEADING_3 }),
          ...modalReport.swot.threats.map(
            s => new Paragraph({ text: `- ${s}` })
          ),
          // Recommendations
          new Paragraph({
            text: 'Recommendations',
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({ text: 'Growth', heading: HeadingLevel.HEADING_3 }),
          ...modalReport.recommendations.growth.map(
            r => new Paragraph({ text: `- ${r}` })
          ),
          new Paragraph({
            text: 'Engagement',
            heading: HeadingLevel.HEADING_3
          }),
          ...modalReport.recommendations.engagement.map(
            r => new Paragraph({ text: `- ${r}` })
          ),
          new Paragraph({
            text: 'Conversions',
            heading: HeadingLevel.HEADING_3
          }),
          ...modalReport.recommendations.conversions.map(
            r => new Paragraph({ text: `- ${r}` })
          ),
          new Paragraph({ text: 'Content', heading: HeadingLevel.HEADING_3 }),
          ...modalReport.recommendations.content.map(
            r => new Paragraph({ text: `- ${r}` })
          ),
          new Paragraph({ text: 'Monitor', heading: HeadingLevel.HEADING_3 }),
          ...modalReport.recommendations.monitor.map(
            r => new Paragraph({ text: `- ${r}` })
          ),
          // Conclusion
          new Paragraph({
            text: 'Conclusion',
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({ text: modalReport.conclusion }),
          new Paragraph({ text: `Prepared by: ${modalReport.preparedBy}` })
        ]
      }
    ]
  })

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${modalReport.companyName}_SocialMediaReport.docx`)
  })
}
