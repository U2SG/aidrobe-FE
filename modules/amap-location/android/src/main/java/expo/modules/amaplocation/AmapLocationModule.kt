package expo.modules.amaplocation

import com.amap.api.location.AMapLocationClient
import com.amap.api.location.AMapLocationClientOption
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// One-shot Amap (高德) location for China, where expo-location's Google-backed
// FusedLocationProvider can't reach Google's servers and times out.
class AmapLocationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AmapLocation")

    AsyncFunction("getCurrentPosition") { promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

      // PIPL: the SDK refuses to locate until privacy is shown + agreed. The app
      // already gates location behind its own permission/consent flow.
      AMapLocationClient.updatePrivacyShow(context, true, true)
      AMapLocationClient.updatePrivacyAgree(context, true)

      try {
        val client = AMapLocationClient(context)
        // Amap option setters are fluent (return the option), so use explicit
        // calls rather than Kotlin property syntax.
        val option = AMapLocationClientOption()
        option.setLocationMode(AMapLocationClientOption.AMapLocationMode.Hight_Accuracy)
        option.setOnceLocation(true)
        option.setOnceLocationLatest(true)
        option.setHttpTimeOut(15000L)
        client.setLocationOption(option)
        client.setLocationListener { loc ->
          if (loc != null && loc.errorCode == 0) {
            promise.resolve(
              mapOf(
                "longitude" to loc.longitude,
                "latitude" to loc.latitude,
                "city" to loc.city,
              )
            )
          } else {
            promise.reject(
              "E_AMAP_LOCATION",
              "amap errorCode=${loc?.errorCode} info=${loc?.errorInfo}",
              null,
            )
          }
          client.stopLocation()
          client.onDestroy()
        }
        client.startLocation()
      } catch (e: Exception) {
        promise.reject("E_AMAP_INIT", e.message ?: "amap client init failed", e)
      }
    }
  }
}
