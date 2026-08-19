import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Node type with simulation properties
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  properties?: any;
}

// Edge type – source and target can be IDs (strings) or node objects (after simulation)
interface Edge {
  source: string | D3Node;
  target: string | D3Node;
  relationship: string;
}

interface KnowledgeGraphVisProps {
  nodes: D3Node[];
  edges: Edge[];
}

export default function KnowledgeGraphVis({ nodes, edges }: KnowledgeGraphVisProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || nodes.length === 0) return;
    const width = ref.current.clientWidth || 400;
    const height = 300;

    ref.current.innerHTML = '';

    const svg = d3.select(ref.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', '#080c16');

    // Simulation with typed nodes and links
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, Edge>(edges).id((d) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll<SVGLineElement, Edge>('line')
      .data(edges)
      .enter().append('line')
      .attr('stroke', '#555')
      .attr('stroke-width', 1);

    const node = svg.append('g')
      .selectAll<SVGCircleElement, D3Node>('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', 8)
      .attr('fill', (d) => d.label === 'project' ? '#3b82f6' : '#10b981')
      .call(d3.drag<SVGCircleElement, D3Node>()
        .on('start', () => {
          simulation.alphaTarget(0.3).restart();
        })
        .on('drag', (event, d) => {
          d.x = event.x;
          d.y = event.y;
        })
        .on('end', () => {
          simulation.alphaTarget(0);
        })
      );

    node.append('title').text((d) => d.label);

    const label = svg.append('g')
      .selectAll<SVGTextElement, D3Node>('text')
      .data(nodes)
      .enter().append('text')
      .text((d) => d.label)
      .attr('font-size', 8)
      .attr('fill', '#ccc')
      .attr('dx', 10)
      .attr('dy', 4);

    simulation.on('tick', () => {
      // Force source/target to D3Node using a type‑safe cast
      link
        .attr('x1', (d) => (d.source as unknown as D3Node).x!)
        .attr('y1', (d) => (d.source as unknown as D3Node).y!)
        .attr('x2', (d) => (d.target as unknown as D3Node).x!)
        .attr('y2', (d) => (d.target as unknown as D3Node).y!);
      node
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!);
      label
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!);
    });

    return () => {
      svg.remove();
    };
  }, [nodes, edges]);

  return <div ref={ref} className="w-full h-72" />;
}