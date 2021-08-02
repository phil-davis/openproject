import {
  ChangeDetectorRef, Directive, Injector, OnInit,
} from '@angular/core';
import { AbstractWidgetComponent } from 'core-app/shared/components/grids/widgets/abstract-widget.component';
import { I18nService } from 'core-app/core/i18n/i18n.service';
import { PathHelperService } from 'core-app/core/path-helper/path-helper.service';
import { TimeEntryEditService } from 'core-app/shared/components/time_entries/edit/edit.service';
import { InjectField } from 'core-app/shared/helpers/angular/inject-field.decorator';
import { APIV3Service } from 'core-app/core/apiv3/api-v3.service';
import { FilterOperator } from 'core-app/shared/helpers/api-v3/api-v3-filter-builder';
import { TimezoneService } from 'core-app/core/datetime/timezone.service';
import { ConfirmDialogService } from 'core-app/shared/components/modals/confirm-dialog/confirm-dialog.service';
import { TimeEntryResource } from 'core-app/features/hal/resources/time-entry-resource';
import idFromLink from 'core-app/features/hal/helpers/id-from-link';

@Directive()
export abstract class WidgetTimeEntriesListComponent extends AbstractWidgetComponent implements OnInit {
  public text = {
    activity: this.i18n.t('js.time_entry.activity'),
    comment: this.i18n.t('js.time_entry.comment'),
    hour: this.i18n.t('js.time_entry.hours'),
    workPackage: this.i18n.t('js.label_work_package'),
    edit: this.i18n.t('js.button_edit'),
    delete: this.i18n.t('js.button_delete'),
    confirmDelete: {
      text: this.i18n.t('js.modals.destroy_time_entry.text'),
      title: this.i18n.t('js.modals.destroy_time_entry.title'),
    },
    noResults: this.i18n.t('js.grid.widgets.time_entries_list.no_results'),
  };

  public entries:TimeEntryResource[] = [];

  private entriesLoaded = false;

  public rows:{ date:string, sum?:string, entry?:TimeEntryResource }[] = [];

  @InjectField() public readonly timeEntryEditService:TimeEntryEditService;

  @InjectField() public readonly apiV3Service:APIV3Service;

  constructor(readonly injector:Injector,
    readonly timezone:TimezoneService,
    readonly i18n:I18nService,
    readonly pathHelper:PathHelperService,
    readonly confirmDialog:ConfirmDialogService,
    protected readonly cdr:ChangeDetectorRef) {
    super(i18n, injector);
  }

  ngOnInit() {
    this
      .apiV3Service
      .time_entries
      .list({ filters: this.dmFilters(), pageSize: 500 })
      .subscribe((collection) => {
        this.buildEntries(collection.elements);
        this.entriesLoaded = true;

        this.cdr.detectChanges();
      });
  }

  public get total() {
    const duration = this.entries.reduce((current, entry) => current + this.timezone.toHours(entry.hours), 0);

    return this.i18n.t('js.units.hour', { count: this.formatNumber(duration) });
  }

  public get anyEntries() {
    return !!this.entries.length;
  }

  public activityName(entry:TimeEntryResource) {
    return entry.activity.name;
  }

  public projectName(entry:TimeEntryResource) {
    return entry.project.name;
  }

  public workPackageName(entry:TimeEntryResource) {
    return `#${entry.workPackage.id}: ${entry.workPackage.name}`;
  }

  public workPackageId(entry:TimeEntryResource) {
    return entry.workPackage.id!;
  }

  public comment(entry:TimeEntryResource) {
    return entry.comment && entry.comment.raw;
  }

  public hours(entry:TimeEntryResource) {
    return this.formatNumber(this.timezone.toHours(entry.hours));
  }

  public workPackagePath(entry:TimeEntryResource) {
    return this.pathHelper.workPackagePath(idFromLink(entry.workPackage.href));
  }

  public get isEditable() {
    return false;
  }

  public editTimeEntry(entry:TimeEntryResource) {
    this
      .apiV3Service
      .time_entries
      .id(entry.id!)
      .get()
      .subscribe((loadedEntry) => {
        this.timeEntryEditService
          .edit(loadedEntry)
          .then((changedEntry) => {
            const oldEntryIndex:number = this.entries.findIndex((el) => el.id === changedEntry.entry.id);
            const newEntries = this.entries;
            newEntries[oldEntryIndex] = changedEntry.entry;

            this.buildEntries(newEntries);
          })
          .catch(() => {
          // User canceled the modal
          });
      });
  }

  public deleteIfConfirmed(event:Event, entry:TimeEntryResource) {
    event.preventDefault();
    this.confirmDialog.confirm({
      text: this.text.confirmDelete,
      closeByEscape: true,
      showClose: true,
      closeByDocument: true,
      passedData: [
        `#${idFromLink(entry.workPackage?.href)} ${entry.workPackage?.name}`,
        `${this.i18n.t(
          'js.units.hour',
          { count: this.timezone.toHours(entry.hours) },
        )} (${entry.activity?.name})`,
      ],
      dangerHighlighting: true,
    }).then(() => {
      entry.delete().then(() => {
        const newEntries = this.entries.filter((anEntry) => entry.id !== anEntry.id);

        this.buildEntries(newEntries);
      });
    })
      .catch(() => {
        // nothing
      });
  }

  protected abstract dmFilters():Array<[string, FilterOperator, [string]]>;

  private buildEntries(entries:TimeEntryResource[]) {
    this.entries = entries;
    const sumsByDateSpent:{ [key:string]:number } = {};

    entries.forEach((entry) => {
      const date = entry.spentOn;

      if (!sumsByDateSpent[date]) {
        sumsByDateSpent[date] = 0;
      }

      sumsByDateSpent[date] = sumsByDateSpent[date] + this.timezone.toHours(entry.hours);
    });

    const sortedEntries = entries.sort((a, b) => b.spentOn.localeCompare(a.spentOn));

    this.rows = [];
    let currentDate:string|null = null;
    sortedEntries.forEach((entry) => {
      if (entry.spentOn !== currentDate) {
        currentDate = entry.spentOn;
        this.rows.push({ date: this.timezone.formattedDate(currentDate!), sum: this.formatNumber(sumsByDateSpent[currentDate!]) });
      }

      this.rows.push({ date: currentDate!, entry });
    });
    // entries
  }

  protected formatNumber(value:number):string {
    return this.i18n.toNumber(value, { precision: 2 });
  }

  public get noEntries() {
    return !this.entries.length && this.entriesLoaded;
  }
}
