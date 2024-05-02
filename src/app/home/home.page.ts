import { Component, OnInit } from '@angular/core';
import html2canvas from 'html2canvas';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AlertController, IonToast, LoadingController, ModalController, Platform, ToastController } from '@ionic/angular';
import { BarcodeScanningModalComponent } from './barcode-scanning-modal.component';
import { LensFacing, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';
import { FilePicker } from '@capawesome/capacitor-file-picker';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit{

  
  segment = 'scan';
  qrText = '';
  scanResult = '';


  constructor(
    private loadingController: LoadingController,
    private platform: Platform,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}
  
  ngOnInit(): void {
    if(this.platform.is('capacitor')){

      BarcodeScanner.isSupported().then();
      BarcodeScanner.checkPermissions().then();
      BarcodeScanner.removeAllListeners();
    }
  }


  async startScan() {
    const modal = await this.modalController.create({
    component: BarcodeScanningModalComponent,
    cssClass: 'barcode-scanning-modal',
    showBackdrop: false,
    componentProps: { 
      formats: [],
      lensFacing: LensFacing.Back
    }
    });
  
    await modal.present();

    const { data } = await modal.onWillDismiss();

    if(data){
      this.scanResult = data?.barcode?.displayValue;
    }
  
  }

   // === Leer QR desde una imagen y guarda el resultado en la variable scanResult ===

   async readBarcodeFromImage(){   
      const {files} = await FilePicker.pickImages({multiple: false});

      //Permitimos el path nulo por que el usuario puede cancelar la selección de la imagen
      const path = files[0]?.path;
      // Si no hay archivos, salimos
      if(!path) return;
      
      const {barcodes} = await BarcodeScanner.readBarcodesFromImage({
        path,
        formats: []
      })
    this.scanResult = barcodes[0].displayValue;
   }

  // === Capture HTML Element, convert it to canvas and get an image ===

  captureScreen() {

    const element = document.getElementById('qrImage') as HTMLElement;

    html2canvas(element).then((canvas: HTMLCanvasElement) => {

      if(this.platform.is('capacitor')){
        this.shareImage(canvas);
      }else{
        this.downloadImage(canvas);
      }
    })
  }

   // === Download the image (web) ===
  downloadImage(canvas: HTMLCanvasElement){

    const link = document.createElement('a');    
    link.href = canvas.toDataURL();
    link.download = 'qrCode.png';
    link.click();
  }

   // === Share the image (mobile) ===
   async shareImage(canvas: HTMLCanvasElement){

    let base64 = canvas.toDataURL();
    let path = 'qrCode.png';
    
    const loading = await this.loadingController.create({spinner: 'crescent'});
    await loading.present();   
      
    await Filesystem.writeFile({
      path: path,
      data: base64,
      directory: Directory.Cache
    }).then(async(res) => {

      let uri = res.uri;
      await Share.share({url: uri,});

      await Filesystem.deleteFile({
        path: path,
        directory: Directory.Cache
      })

    }).finally(() => {

      loading.dismiss();

    })

  }

  // === Copiar portapapeles ===
   copyToClipboard = async () => {
      await Clipboard.write({
        string: this.scanResult
      });

      const toast = await this.toastController.create({     
        message: 'Copiado al portapapeles',
        duration: 1000,
        color: 'tertiary',
        icon: 'clipboard-outline'
      });

      toast.present();
    }

     // === Comprobamos si el resultado del escano es una url con una expresion regular ===
  
    isUrl(){
      let regex = /\.(com|net|io|me|crypto|ai)\b/i;
      return regex.test(this.scanResult);
    }

    // === Abrir el navegador con el resultado del escaneo ===
     openCapacitorSite = async () => {

      let url = this.scanResult;
      if(!['https://'].includes(this.scanResult)){
        url = `https://${this.scanResult}`;
     }

    
      const alert = await this.alertController.create({
        header: 'Confirma',
        message: '¿Quieres abrir el navegador?',
        buttons: [
          {
            text: 'No',
            role: 'cancel'           
          }, {
            text: 'Si',
            handler: async() => {
              await Browser.open({ url: url });
            }
          }
        ]
      });
     
      await alert.present();   

      
    };
  

}
