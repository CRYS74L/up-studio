// Adapted from rdev/liquid-glass-react (MIT). Only the optical filter is reused;
// no library mouse tracking, typography, positioning, or elastic hover is applied.
import type React from 'react';
import {displacementMap,polarDisplacementMap,prominentDisplacementMap} from './maps';
const getMap=(mode:string,shaderMapUrl?:string)=>mode==='polar'?polarDisplacementMap:mode==='prominent'?prominentDisplacementMap:mode==='shader'&&shaderMapUrl?shaderMapUrl:displacementMap;export const GlassFilter: React.FC<{ id: string; displacementScale: number; aberrationIntensity: number; width: number; height: number; mode: "standard" | "polar" | "prominent" | "shader"; shaderMapUrl?: string; gentle?: boolean }> = ({
  id,
  displacementScale,
  aberrationIntensity,
  width,
  height,
  mode,
  shaderMapUrl,
  gentle=false,
}) => (
  <svg style={{ position: "absolute", width, height }} aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-edge-mask`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="black" stopOpacity="0" />
        <stop offset={`${Math.max(30, 80 - aberrationIntensity * 2)}%`} stopColor="black" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="1" />
      </radialGradient>
      <filter id={id} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x={-Math.abs(displacementScale)-2} y={-Math.abs(displacementScale)-2} width={width+2*Math.abs(displacementScale)+4} height={height+2*Math.abs(displacementScale)+4} colorInterpolationFilters="sRGB">
        <feImage id={`${id}-image`} x="0" y="0" width={width} height={height} result="DISPLACEMENT_MAP" href={getMap(mode, shaderMapUrl)} preserveAspectRatio="none" />

        <feImage x="0" y="0" width={width} height={height} href={'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="1" y="1" width="${Math.max(0,width-2)}" height="${Math.max(0,height-2)}" rx="24" fill="none" stroke="white" stroke-width="14"/></svg>`)} result="EDGE_SOURCE"/>
        <feGaussianBlur in="EDGE_SOURCE" stdDeviation={gentle?5:2} result="EDGE_MASK"/>

        {gentle ? <>
          {/* Fade the displacement vector to neutral before sampling, avoiding
              a second displaced image composited over the original. */}
          <feComposite in="DISPLACEMENT_MAP" in2="EDGE_MASK" operator="in" result="EDGE_VECTOR"/>
          <feFlood floodColor="rgb(128,128,128)" result="NEUTRAL_VECTOR"/>
          <feComposite in="EDGE_VECTOR" in2="NEUTRAL_VECTOR" operator="over" result="SOFT_VECTOR"/>
          <feDisplacementMap in="SourceGraphic" in2="SOFT_VECTOR" scale={-Math.min(6,Math.abs(displacementScale))} xChannelSelector="R" yChannelSelector="B"/>
        </> : <>
        {/* Original undisplaced image for center */}
        <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />

        {/* Red channel displacement with slight offset */}
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale={displacementScale * (mode === "shader" ? 1 : -1)} xChannelSelector="R" yChannelSelector="B" result="RED_DISPLACED" />
        <feColorMatrix
          in="RED_DISPLACED"
          type="matrix"
          values="1 0 0 0 0
                 0 0 0 0 0
                 0 0 0 0 0
                 0 0 0 1 0"
          result="RED_CHANNEL"
        />

        {/* Green channel displacement */}
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale={displacementScale * ((mode === "shader" ? 1 : -1) - aberrationIntensity * 0.05)} xChannelSelector="R" yChannelSelector="B" result="GREEN_DISPLACED" />
        <feColorMatrix
          in="GREEN_DISPLACED"
          type="matrix"
          values="0 0 0 0 0
                 0 1 0 0 0
                 0 0 0 0 0
                 0 0 0 1 0"
          result="GREEN_CHANNEL"
        />

        {/* Blue channel displacement with slight offset */}
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale={displacementScale * ((mode === "shader" ? 1 : -1) - aberrationIntensity * 0.1)} xChannelSelector="R" yChannelSelector="B" result="BLUE_DISPLACED" />
        <feColorMatrix
          in="BLUE_DISPLACED"
          type="matrix"
          values="0 0 0 0 0
                 0 0 0 0 0
                 0 0 1 0 0
                 0 0 0 1 0"
          result="BLUE_CHANNEL"
        />

        {/* Combine all channels with screen blend mode for chromatic aberration */}
        <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
        <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />

        {/* Add slight blur to soften the aberration effect */}
        <feGaussianBlur in="RGB_COMBINED" stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)} result="ABERRATED_BLURRED" />

        {/* Apply edge mask to aberration effect */}
        <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />

        {/* Create inverted mask for center */}
        <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
          <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />

        {/* Combine edge aberration with clean center */}
        <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
        </>}
      </filter>
    </defs>
  </svg>
)
