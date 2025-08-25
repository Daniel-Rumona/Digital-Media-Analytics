import { Dayjs } from 'dayjs'

export type MetricDoc = {
  platform: string;            // 'google' | 'facebook' | 'instagram' | 'tiktok' | 'x'
  period: string;              // 'YYYY-MM'
  metrics: Record<string, number>;
};

export type ChartGroup = {
  title: string;
  metrics: string[];
  colors?: string[];
};

export type ExportedImage = { title: string; dataUrl: string };

export type ModalReport = {
  companyName: string;
  period: string;
  overview: string;
  consolidatedChartObservations: string[];
  platforms: {
    name: string; // e.g. 'Google', 'Facebook', 'Instagram', 'TikTok', 'X'
    metrics: { label: string; value: string | number; industryAverage?: string | number }[];
    observations: string[];
  }[];
  googleFunnelObservations?: string[];
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  recommendations: { growth: string[]; engagement: string[]; conversions: string[]; content: string[]; monitor: string[] };
  conclusion: string;
  preparedBy: string;
  address?: string; regNumber?: string;
  targetAudience?: string[]; marketingChannels?: string[]; promotions?: string[]; analytics?: string[];
};
