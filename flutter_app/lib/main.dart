import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint("Handling a background message: ${message.messageId}");
}

Future<void> main() async {
  WidgetsBinding widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  // Preserve splash screen until WebView starts loading
  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);

  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint("Firebase initialization failed: $e");
  }

  runApp(const OdishaExamPrepApp());
}

class OdishaExamPrepApp extends StatelessWidget {
  const OdishaExamPrepApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Odisha Exam Prep',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          primary: const Color(0xFF2563EB),
          surface: const Color(0xFFF8FAFC),
        ),
      ),
      home: const WebViewScreen(),
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _hasError = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _initWebViewController();
    _setupForegroundNotifications();
  }

  void _setupForegroundNotifications() {
    try {
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint("Foreground FCM message received: ${message.notification?.title}");
      });
    } catch (e) {
      debugPrint("Foreground notification listener error: $e");
    }
  }

  Future<void> _sendFcmTokenToWeb() async {
    try {
      String? token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        debugPrint("FCM Registration Token: $token");
        await _controller.runJavaScript("if (window.onNativeFcmTokenReceived) window.onNativeFcmTokenReceived('$token');");
      }
    } catch (e) {
      debugPrint("Error fetching FCM token: $e");
    }
  }

  Future<void> _requestPermissions() async {
    // Request critical permissions for features like camera (if any), audio/mic, and notifications
    try {
      await [
        Permission.camera,
        Permission.microphone,
      ].request();
      
      // Request notification permissions (Android 13+)
      if (await Permission.notification.isDenied) {
        await Permission.notification.request();
      }
    } catch (e) {
      debugPrint("Permissions request failed: $e");
    }
  }

  void _initWebViewController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF8FAFC))
      ..setUserAgent("OdishaExamPrepApp/1.0 (Android; WebView)")
      ..addJavaScriptChannel(
        'NativePushChannel',
        onMessageReceived: (JavaScriptMessage message) {
          if (message.message == 'request_token') {
            _sendFcmTokenToWeb();
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _hasError = false;
            });
            // Dismiss splash screen on first page load start
            FlutterNativeSplash.remove();
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint("WebView Error: Code: ${error.errorCode}, Description: ${error.description}");
            // Handle offline and DNS lookup errors (-2: Host lookup failed, -6: Connect timed out)
            if (error.errorCode < 0) {
              setState(() {
                _hasError = true;
                _isLoading = false;
              });
            }
          },
          onNavigationRequest: (NavigationRequest request) async {
            final String url = request.url;
            debugPrint("Navigating to: $url");

            // 1. Intercept file downloads (PDFs, files)
            if (url.toLowerCase().endsWith('.pdf') || 
                url.contains('/api/download') || 
                url.contains('/download')) {
              debugPrint("Intercepted download link: $url");
              _launchExternalUrl(url);
              return NavigationDecision.prevent;
            }

            // 2. Intercept custom protocol schemes (UPI, WhatsApp, Intent, etc.)
            final Uri uri = Uri.parse(url);
            if (uri.scheme != 'http' && uri.scheme != 'https') {
              debugPrint("Intercepted non-http scheme: ${uri.scheme}");
              _launchExternalUrl(url);
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse("https://odishaexamprep.in/?app=true"));
  }

  Future<void> _launchExternalUrl(String urlString) async {
    final Uri url = Uri.parse(urlString);
    try {
      final bool launched = await launchUrl(url, mode: LaunchMode.externalApplication);
      if (!launched) {
        debugPrint("System launcher refused to open URL: $urlString");
      }
    } catch (e) {
      debugPrint("Error launching external app: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else {
          // Exit/Minimize the app if no history to go back to
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: SafeArea(
          child: Stack(
            children: [
              // Main WebView
              if (!_hasError)
                WebViewWidget(controller: _controller),

              // Loading Spinner
              if (_isLoading && !_hasError)
                const Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFF2563EB),
                  ),
                ),

              // Offline / Error screen
              if (_hasError)
                _buildOfflineScreen(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOfflineScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Icon(
              Icons.wifi_off_rounded,
              size: 80,
              color: Color(0xFF2563EB),
            ),
            const SizedBox(height: 24),
            const Text(
              "Connection Lost",
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            const Text(
              "We couldn't connect to the server. Please check your internet connection and try again.",
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _hasError = false;
                  _isLoading = true;
                });
                _controller.reload();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text("Try Again"),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
