package com.inappreview

import com.facebook.react.bridge.ReactApplicationContext

class InAppReviewModule(
  reactContext: ReactApplicationContext,
) : NativeInAppReviewSpec(reactContext) {
  override fun multiply(
    a: Double,
    b: Double,
  ): Double = a * b

  companion object {
    const val NAME = NativeInAppReviewSpec.NAME
  }
}
