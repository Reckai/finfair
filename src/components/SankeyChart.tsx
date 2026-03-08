import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Path, Text as SvgText } from 'react-native-svg';
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  SankeyNode as D3SankeyNode,
  SankeyLink as D3SankeyLink,
} from 'd3-sankey';
import { SankeyData, SankeyNode } from '../services/analytics';
import { colors } from '../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NODE_WIDTH = 14;
const NODE_PADDING = 16;

interface SankeyChartProps {
  data: SankeyData;
  width?: number;
  height?: number;
}

interface SNodeExtra {
  id: string;
  label: string;
  type: SankeyNode['type'];
  color: string;
}

interface SLinkExtra {
  sourceColor: string;
}

type SNode = D3SankeyNode<SNodeExtra, SLinkExtra>;
type SLink = D3SankeyLink<SNodeExtra, SLinkExtra>;

function getNodeColor(node: SankeyNode): string {
  switch (node.type) {
    case 'income':
      return '#4CAF50';
    case 'bucket': {
      const lower = node.id.toLowerCase();
      if (lower.includes('need') || lower.includes('необхідн')) return '#2196F3';
      if (lower.includes('want') || lower.includes('бажан')) return '#FF9800';
      if (lower.includes('saving') || lower.includes('накопич')) return '#9C27B0';
      return '#607D8B';
    }
    case 'expense':
      return '#F44336';
    case 'remainder':
      return '#9E9E9E';
    case 'total':
      return '#607D8B';
    default:
      return '#607D8B';
  }
}

function formatAmount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K ₴`;
  }
  return `${Math.round(value)} ₴`;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({
  data,
  width: propWidth,
  height: propHeight,
}) => {
  const width = propWidth ?? SCREEN_WIDTH - 32;
  const height = propHeight ?? 400;

  const layout = useMemo(() => {
    if (!data.nodes.length || !data.links.length) return null;

    const nodeIdToIndex = new Map<string, number>();
    data.nodes.forEach((n, i) => nodeIdToIndex.set(n.id, i));

    const nodes: SNodeExtra[] = data.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      color: getNodeColor(n),
    }));

    const links: { source: string; target: string; value: number; sourceColor: string }[] =
      data.links
        .filter((l) => nodeIdToIndex.has(l.source) && nodeIdToIndex.has(l.target))
        .map((l) => {
          const sourceIdx = nodeIdToIndex.get(l.source)!;
          return {
            source: l.source,
            target: l.target,
            value: l.value,
            sourceColor: nodes[sourceIdx].color,
          };
        });

    if (!links.length) return null;

    const generator = d3Sankey<SNodeExtra, SLinkExtra>()
      .nodeId((d) => (d as SNodeExtra).id)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [1, 1],
        [width - 1, height - 1],
      ]);

    return generator({ nodes, links });
  }, [data, width, height]);

  if (!data.nodes.length || !data.links.length || !layout) {
    return (
      <View style={[styles.container, { width }]}>
        <Text style={styles.emptyText}>Немає даних</Text>
      </View>
    );
  }

  const linkPathGenerator = sankeyLinkHorizontal();

  return (
    <View style={[styles.container, { width }]}>
      <Svg width={width} height={height}>
        {(layout.links as SLink[]).map((link, i) => {
          const path = linkPathGenerator(link as any);
          if (!path) return null;
          const sourceNode = link.source as SNode;
          return (
            <Path
              key={`link-${i}`}
              d={path}
              fill="none"
              stroke={sourceNode.color}
              strokeOpacity={0.3}
              strokeWidth={Math.max(link.width ?? 1, 1)}
            />
          );
        })}
        {(layout.nodes as SNode[]).map((node, i) => {
          const x0 = node.x0 ?? 0;
          const y0 = node.y0 ?? 0;
          const x1 = node.x1 ?? 0;
          const y1 = node.y1 ?? 0;
          const nodeHeight = y1 - y0;
          const isLeftSide = x0 < width / 2;
          const labelX = isLeftSide ? x0 - 4 : x1 + 4;
          const textAnchor = isLeftSide ? 'end' : 'start';
          const value = node.value ?? 0;
          const spent =
            node.type === 'bucket'
              ? (node.sourceLinks ?? []).reduce(
                  (sum: number, sl: SLink) => {
                    const targetNode = sl.target as SNode;
                    if (targetNode.type === 'remainder') return sum;
                    return sum + (sl.value ?? 0);
                  },
                  0,
                )
              : 0;
          const labelText =
            node.type === 'bucket'
              ? `${node.label} ${formatAmount(value)} (${formatAmount(spent)})`
              : `${node.label} ${formatAmount(value)}`;

          return (
            <React.Fragment key={`node-${i}`}>
              <Rect
                x={x0}
                y={y0}
                width={x1 - x0}
                height={Math.max(nodeHeight, 1)}
                fill={node.color}
                rx={2}
              />
              {nodeHeight > 12 && (
                <SvgText
                  x={labelX}
                  y={y0 + nodeHeight / 2}
                  textAnchor={textAnchor}
                  alignmentBaseline="middle"
                  fontSize={10}
                  fill={colors.textPrimary}
                >
                  {labelText}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
