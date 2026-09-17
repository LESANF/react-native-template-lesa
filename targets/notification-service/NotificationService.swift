import Foundation
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?
  var downloadTask: URLSessionDownloadTask?
  private let lock = NSLock()
  private var didComplete = false

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent
    log("received notification keys=\(request.content.userInfo.keys.map { "\($0)" }.sorted())")

    guard bestAttemptContent != nil else {
      log("mutable content copy failed")
      contentHandler(request.content)
      return
    }

    guard let imageURL = extractImageURL(from: request.content.userInfo) else {
      log("image URL not found")
      finish()
      return
    }
    log("image URL found host=\(imageURL.host ?? "-") path=\(imageURL.path)")

    downloadTask = URLSession.shared.downloadTask(with: imageURL) { [weak self] tempURL, response, _ in
      guard let self = self else { return }
      let attachment = self.makeAttachment(from: tempURL, response: response)
      self.finish(attachment: attachment)
    }
    downloadTask?.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    downloadTask?.cancel()
    log("service extension time will expire")
    finish()
  }

  private func makeAttachment(from tempURL: URL?, response: URLResponse?) -> UNNotificationAttachment? {
    guard let tempURL = tempURL else {
      log("download finished without temp file")
      return nil
    }

    let mimeType = response?.mimeType ?? "image/jpeg"
    let fileExtension = mimeType.split(separator: "/").last.map(String.init) ?? "jpg"
    log("downloaded image mimeType=\(mimeType) extension=\(fileExtension)")
    let attachmentURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension(fileExtension)

    do {
      try FileManager.default.moveItem(at: tempURL, to: attachmentURL)
      let attachment = try UNNotificationAttachment(identifier: UUID().uuidString, url: attachmentURL)
      log("attachment created")
      return attachment
    } catch {
      // attachment 실패 시 이미지 없이 알림 표시
      log("attachment failed error=\(error.localizedDescription)")
      return nil
    }
  }

  // contentHandler는 NSE 수명 동안 한 번만 호출되어야 함.
  // download completion(background)과 serviceExtensionTimeWillExpire(main) 양쪽에서 호출 가능 → lock 보호.
  private func finish(attachment: UNNotificationAttachment? = nil) {
    lock.lock()
    if didComplete {
      lock.unlock()
      return
    }
    didComplete = true
    let handler = contentHandler
    let content = bestAttemptContent
    if let attachment = attachment {
      content?.attachments = [attachment]
    }
    lock.unlock()

    if let handler = handler, let content = content {
      handler(content)
    }
  }

  private func extractImageURL(from userInfo: [AnyHashable: Any]) -> URL? {
    if let url = extractImageURLFromDictionary(userInfo) {
      return url
    }

    if let data = userInfo["data"] as? [String: Any],
       let url = extractImageURLFromDictionary(data) {
      return url
    }

    return nil
  }

  private func extractImageURLFromDictionary(_ dictionary: [AnyHashable: Any]) -> URL? {
    if let fcmOptions = dictionary["fcm_options"] as? [String: Any],
       let url = makeURL(from: fcmOptions["image"] as? String) {
      return url
    }

    if let fcmOptions = dictionary["fcm_options"] as? String,
       let url = makeURL(from: imageURLString(fromJSONString: fcmOptions)) {
      return url
    }

    let imageKeys = [
      "image",
      "imageUrl",
      "gcm.notification.image",
      "gcm.n.image",
      "gcm.notification.image-url",
      "gcm.n.image-url",
    ]

    for key in imageKeys {
      if let url = makeURL(from: dictionary[key] as? String) {
        return url
      }
    }

    return nil
  }

  private func imageURLString(fromJSONString string: String) -> String? {
    guard let data = string.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      return nil
    }
    return json["image"] as? String
  }

  private func makeURL(from urlString: String?) -> URL? {
    guard let urlString = urlString?.trimmingCharacters(in: .whitespacesAndNewlines),
          !urlString.isEmpty else {
      return nil
    }
    return URL(string: urlString)
  }

  private func log(_ message: String) {
    NSLog("[NotificationService] %@", message)
  }
}
