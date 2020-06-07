
const R = require('Reactive')
const Time = require('Time')
const M = require('Materials')
const T = require('Textures')
const Shaders = require('Shaders')
const CameraInfo = require('CameraInfo')

// rotate
const rotate2d = (uv, angle) => {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  uv = R.pack2(
    R.add(
      uv.x.mul(cos),
      uv.y.mul(sin)
    ),
    R.sub(
      uv.y.mul(cos),
      uv.x.mul(sin)
    )
  )
  return uv
}

//luma
const luma = sample => {
  const l = R.dot(R.pack4(0.299, 0.587, 0.114, 1), R.pack4(sample.x, sample.y, sample.z, sample.w))
  return R.pack4(l, l, l, sample.w)
}

Promise.all([
  M.findFirst('cameraMat'),
  T.findFirst('cameraTexture0'),
  T.findFirst('gold')
])
  .then(assets => {
    // material
    const cameraMaterial = assets[0]
    const cameraSignal = assets[1].signal
    const matSignal = assets[2].signal

    const uv = Shaders.fragmentStage(Shaders.vertexAttribute({
      'variableName': Shaders.VertexAttribute.TEX_COORDS
    }))

    const time = Time.ms.mul(0.01)

    const levels = 5.7
    const angle = Math.PI / levels
    const spacing = 0.014
    const alias = 0.0025
    const height = 0.005
    const bright = 0.1
    const width = 0.005
    const dist = 0.10

    const guilloche = (color, uv, time) => {
      let result = R.pack4(1, 1, 1, 1)
      const sample = luma(Shaders.textureSampler(color, uv))
      for (let i = 0, nuv, wave, x, y, line, waves, fq; i < levels; i += 1.0) {
        nuv = rotate2d(uv, angle + angle * i)
        wave = R.sin(nuv.x.mul(frequency)).mul(height)
        x = wave.sum((spacing * 0.85))
        y = R.mod(nuv.y, spacing)
        line = (R.val(0.9).sub(sample.mul(bright)).sub(i * dist)).mul(width)
        waves = R.smoothStep(line, line.sum(alias), R.abs(x.sub(y)))
        result = result.sum(waves)
      }
      result = result.div(levels)
      result = R.mix(color, result.mul(color), 0.97)
      return R.smoothStep(result, 0.0, 0.95)
    }

    const displacementFactor = R.val(2.0).add(R.sin(time.mul(0.025)).mul(1.0))
    const frequency = R.abs(R.sin(time.mul(0.01)).mul(20))

    const render = (signal, uv, time) => {
      const guillocheSignal = guilloche(signal, uv, time)
      const displacementSignal = luma(Shaders.composition(cameraSignal, uv))
      const displacementOffset = R.mul(displacementSignal.y, displacementFactor)
      cameraMaterial.setTextureSlot(
        Shaders.DefaultMaterialTextures.DIFFUSE,
        Shaders.composition(guillocheSignal, uv.add(displacementOffset))
      )
    }

    render(matSignal, uv, time)
  })
