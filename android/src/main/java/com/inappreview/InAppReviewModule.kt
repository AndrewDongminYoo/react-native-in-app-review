package com.inappreview

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.play.core.review.ReviewManagerFactory

class InAppReviewModule(
  reactContext: ReactApplicationContext,
) : NativeInAppReviewSpec(reactContext) {
  override fun isAvailable(promise: Promise) {
    try {
      // Available when the Google Play Store app is installed (API 21+ is already enforced
      // by minSdkVersion 24). We check by resolving the Play Store package.
      reactApplicationContext.packageManager
        .getPackageInfo("com.android.vending", 0)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  override fun requestReview(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("ACTIVITY_NULL", "No foreground activity found")
      return
    }

    val manager = ReviewManagerFactory.create(reactApplicationContext)
    val request = manager.requestReviewFlow()
    request.addOnCompleteListener { task ->
      if (task.isSuccessful) {
        val reviewInfo = task.result
        val flow = manager.launchReviewFlow(activity, reviewInfo)
        flow.addOnCompleteListener {
          // launchReviewFlow always succeeds (the OS silently rate-limits the dialog).
          promise.resolve(null)
        }
      } else {
        promise.reject(
          "REVIEW_FLOW_ERROR",
          task.exception?.message ?: "Failed to request review flow",
          task.exception,
        )
      }
    }
  }

  override fun openStoreListing(
    appStoreId: String?,
    promise: Promise,
  ) {
    val id =
      appStoreId?.takeIf { it.isNotBlank() }
        ?: reactApplicationContext.packageName

    val activity = currentActivity
    if (activity == null) {
      promise.reject("ACTIVITY_NULL", "No foreground activity found")
      return
    }

    try {
      val marketUri = Uri.parse("market://details?id=$id")
      val intent =
        Intent(Intent.ACTION_VIEW, marketUri).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
      activity.startActivity(intent)
      promise.resolve(null)
    } catch (e: ActivityNotFoundException) {
      // Fall back to browser URL when the Play Store app is not installed.
      try {
        val webUri = Uri.parse("https://play.google.com/store/apps/details?id=$id")
        val fallback =
          Intent(Intent.ACTION_VIEW, webUri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
        activity.startActivity(fallback)
        promise.resolve(null)
      } catch (ex: Exception) {
        promise.reject("OPEN_STORE_FAILED", ex.message, ex)
      }
    }
  }

  companion object {
    const val NAME = NativeInAppReviewSpec.NAME
  }
}
