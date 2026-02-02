'use client'

import { BaseEdge, EdgeProps, getSmoothStepPath } from 'reactflow'

export default function CustomEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  } = props

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <BaseEdge
      path={edgePath}
      interactionWidth={50}
      style={{
        stroke: '#000000',
        strokeWidth: 2,
      }}
      {...props}
    />
  )
}
